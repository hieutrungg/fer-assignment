import { create, get, list, requireRule, update, writeDemo } from "./api";
import { getDeck, getLearner, listLearners } from "./deckService";
import { listWords } from "./wordService";

export const listQuestions = () => list("questions");
export const getQuestion = (id) => get("questions", id);
export const listAssignments = () => list("assignments");
export const getAssignment = (id) => get("assignments", id);
export const listAttempts = () => list("quizAttempts");
export const questionsForDeck = (questions, deck) =>
  questions.filter((question) => deck?.wordIds.includes(question.wordId));
export const visibleAssignment = (assignment, learnerId) =>
  ["PUBLISHED", "CLOSED"].includes(assignment.status) && assignment.learnerIds.includes(learnerId);
export const pastDue = (assignment) => Date.parse(assignment.dueAt) <= Date.now();
export const canSubmit = (assignment) => assignment.status === "PUBLISHED" && !pastDue(assignment);
export const assignmentAttempts = (attempts, id) => attempts.filter((attempt) => attempt.assignmentId === id);
const signature = (question) => JSON.stringify([
  question.id, question.wordId, question.prompt, question.options, question.correctAnswer, question.explanation,
]);

export function score(attempt) {
  const total = attempt.answers.length;
  const correct = attempt.answers.filter((answer) => answer.selectedAnswer === answer.correctAnswer).length;
  return { correct, total, percent: total ? Math.round(correct * 100 / total) : 0 };
}

export function saveQuestion(id, question) {
  return writeDemo(async () => {
    const words = await listWords();
    requireRule(words.some((word) => word.id === question.wordId), "Chọn một từ hợp lệ.");
    requireRule(question.prompt && question.explanation, "Nhập nội dung câu hỏi và giải thích.");
    requireRule(question.options.length === 4 && question.options.every(Boolean) &&
      new Set(question.options.map((option) => option.toLowerCase())).size === 4,
    "Nhập bốn lựa chọn khác nhau.");
    requireRule(question.options.includes(question.correctAnswer), "Chọn một đáp án đúng.");

    if (!id) return create("questions", question);
    const [assignments, decks, attempts] = await Promise.all([listAssignments(), list("decks"), listAttempts()]);
    const usedBy = assignments.filter((item) => item.questionIds.includes(id));
    requireRule(!usedBy.some((item) => attempts.some((attempt) => attempt.assignmentId === item.id)),
      "Câu hỏi thuộc bài giao đã có lượt nộp. Hãy tạo câu hỏi mới nếu cần thay đổi nội dung.");
    requireRule(usedBy.every((item) => decks.find((deck) => deck.id === item.deckId)?.wordIds.includes(question.wordId)),
      "Từ được chọn phải nằm trong các bộ đang giao câu hỏi này.");
    return update("questions", id, question);
  });
}

export function saveAssignment(id, teacherId, form, status) {
  return writeDemo(async () => {
    const [teacher, existing, questions, learners, attempts] = await Promise.all([
      get("accounts", teacherId), id ? getAssignment(id) : null,
      listQuestions(), listLearners(), listAttempts(),
    ]);
    requireRule(teacher.role === "teacher", "Chỉ giảng viên mới được lưu bài giao.");
    requireRule(!existing || existing.status !== "CLOSED", "Bài giao đã đóng.");
    requireRule(!existing || existing.status === "DRAFT" || status !== "DRAFT", "Bài đã giao không thể chuyển về nháp.");

    const locked = id && assignmentAttempts(attempts, id).length > 0;
    const questionIds = [...new Set(form.questionIds)];
    const learnerIds = [...new Set(form.learnerIds)];
    requireRule(!locked || (
      existing.deckId === form.deckId &&
      JSON.stringify(existing.questionIds) === JSON.stringify(questionIds) &&
      JSON.stringify(existing.learnerIds) === JSON.stringify(learnerIds)
    ), "Bài đã có lượt nộp. Hãy tải lại trang để sửa tên hoặc hạn nộp.");
    requireRule(form.deckId, "Chọn bộ flashcard.");
    const deck = await getDeck(form.deckId);
    const allowedQuestions = questionsForDeck(questions, deck);
    requireRule(form.title, "Nhập tên bài giao.");
    requireRule(questionIds.length && questionIds.every((id) => allowedQuestions.some((question) => question.id === id)),
      "Chọn ít nhất một câu hỏi thuộc bộ flashcard.");
    requireRule(learnerIds.length && learnerIds.every((id) => learners.some((learner) => learner.id === id)),
      "Chọn ít nhất một người nhận hợp lệ.");
    requireRule(Number.isFinite(Date.parse(form.dueAt)), "Chọn hạn nộp hợp lệ.");
    requireRule(status !== "PUBLISHED" || existing?.status === "PUBLISHED" || !pastDue(form),
      "Hạn nộp phải nằm trong tương lai khi giao bài.");
    const payload = { title: form.title, deckId: deck.id, questionIds, learnerIds, dueAt: form.dueAt, status };
    return id ? update("assignments", id, payload)
      : create("assignments", { ...payload, teacherId, createdAt: new Date().toISOString() });
  });
}

export function closeAssignment(id) {
  return writeDemo(async () => {
    const assignment = await getAssignment(id);
    requireRule(assignment.status === "PUBLISHED", "Chỉ có thể đóng bài đã giao.");
    return update("assignments", id, { status: "CLOSED" });
  });
}

export async function loadQuiz({ assignmentId, deckId, learnerId }) {
  const assignment = assignmentId ? await getAssignment(assignmentId) : null;
  if (assignment) {
    requireRule(visibleAssignment(assignment, learnerId), "Bạn không có quyền truy cập bài giao này.");
    const attempts = assignmentAttempts(await listAttempts(), assignmentId);
    const result = attempts.find((attempt) => attempt.learnerId === learnerId);
    if (result) return { title: assignment.title, result };
    requireRule(canSubmit(assignment), "Bài giao đã đóng hoặc quá hạn nộp.");
  }

  const [deck, learner, questions] = await Promise.all([
    getDeck(assignment?.deckId || deckId), getLearner(learnerId), listQuestions(),
  ]);
  requireRule(learner.status === "ACTIVE", "Hồ sơ người học đang ngừng hoạt động.");
  requireRule(assignment || deck.status === "OPEN", "Bộ này đã đóng.");
  const available = questionsForDeck(questions, deck);
  const selected = assignment ? assignment.questionIds.map((id) => available.find((question) => question.id === id)) : available;
  requireRule(selected.every(Boolean), "Bài giao có câu hỏi không còn thuộc bộ. Hãy báo giảng viên.");
  return { title: assignment?.title || deck.name, deck, questions: selected };
}

export function submitQuiz(params, displayedQuestions, selections) {
  return writeDemo(async () => {
    const { deck, questions, result } = await loadQuiz(params);
    if (result) return result;
    requireRule(questions.length && questions.map(signature).join("\n") === displayedQuestions.map(signature).join("\n"),
      "Câu hỏi đã thay đổi. Hãy tải lại bài trước khi nộp.");
    requireRule(questions.every((question) => question.options.includes(selections[question.id])),
      "Hãy trả lời tất cả câu hỏi trước khi nộp.");

    const answers = questions.map(({ id, wordId, prompt, options, correctAnswer, explanation }) => ({
      questionId: id, wordId, prompt, options, selectedAnswer: selections[id], correctAnswer, explanation,
    }));
    return create("quizAttempts", {
      learnerId: params.learnerId, deckId: deck.id, topicId: deck.topicId,
      ...(params.assignmentId && { assignmentId: params.assignmentId }),
      completedAt: new Date().toISOString(), answers,
    });
  });
}
