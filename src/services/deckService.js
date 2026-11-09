import { create, get, list, remove, requireRule, update, writeDemo } from "./api";
import { listTopics, listWords } from "./wordService";
import { cardRecords } from "../flashcards";

export async function listDecks({ includeArchived = false } = {}) {
  const decks = await list("decks");
  return includeArchived ? decks : decks.filter((deck) => !deck.deletedAt);
}

export async function getDeck(id) {
  const deck = await get("decks", id);
  requireRule(!deck.deletedAt, "Bộ flashcard đã bị xóa.");
  return deck;
}

export const listLearners = () => list("learners");
export const getLearner = (id) => get("learners", id);
export const isJoined = (deck, learnerId) =>
  deck.members.some((member) => member.learnerId === learnerId && member.status === "joined");

async function requireAssignmentWords(deckId, wordIds) {
  const [assignments, questions] = await Promise.all([list("assignments"), list("questions")]);
  const usedIds = new Set(assignments.filter((item) => item.deckId === deckId).flatMap((item) => item.questionIds));
  requireRule(questions.every((question) => !usedIds.has(question.id) || wordIds.includes(question.wordId)),
    "Không thể bỏ từ đang có câu hỏi trong bài giao của bộ này.");
}

function withCards(deck, cards, wordIds = deck.wordIds) {
  const ids = new Set(cards.map((card) => card.id));
  return { cards, wordIds, cardProgress: (deck.cardProgress ?? []).filter((item) => ids.has(item.cardId)) };
}

export function saveDeck(id, payload) {
  return writeDemo(async () => {
    const { topicId, status } = payload;
    const name = payload.name.trim();
    const description = payload.description.trim();
    const wordIds = [...new Set(payload.wordIds)];
    requireRule(name, "Nhập tên bộ flashcard.");
    requireRule(["OPEN", "CLOSED"].includes(status), "Trạng thái bộ không hợp lệ.");

    const [topics, words, learners, deck] = await Promise.all([
      listTopics(), listWords(), listLearners(), id ? getDeck(id) : null,
    ]);
    requireRule(!topicId || topics.some((topic) => topic.id === topicId), "Chọn chủ đề hợp lệ.");
    requireRule(wordIds.every((id) => words.some((word) => word.id === id && word.topicId === topicId)),
      "Chọn các từ thuộc chủ đề của bộ.");
    const members = new Map(deck ? deck.members.map((member) => [member.learnerId, member]) : []);
    for (const [learnerId, status] of Object.entries(payload.memberChanges)) {
      requireRule(learners.some((learner) => learner.id === learnerId) &&
        ["joined", "left"].includes(status), "Thành viên hoặc trạng thái không hợp lệ.");
      members.set(learnerId, { ...members.get(learnerId), learnerId, status });
    }

    const data = { name, description, topicId, wordIds, status, members: [...members.values()] };
    if (!deck) return create("decks", data);

    requireRule(JSON.stringify(deck.wordIds) === JSON.stringify(payload.originalWordIds),
      "Danh sách từ đã thay đổi. Hãy tải lại trang trước khi lưu.");
    requireRule(deck.wordIds.every((id) => wordIds.includes(id)),
      "Hãy xóa thẻ liên kết từ trang chi tiết bộ để xác nhận việc xóa tiến độ.");
    if (deck.topicId !== topicId) {
      const history = await Promise.all(["assignments", "reviewLogs", "quizAttempts"].map(list));
      requireRule(!history.some((items) => items.some((item) => item.deckId === id)),
        "Không thể đổi chủ đề khi bộ đã có bài giao, lượt ôn hoặc lượt quiz.");
    }
    const added = wordIds.filter((id) => !deck.wordIds.includes(id));
    if (!added.length) return update("decks", id, data);
    const cards = [...cardRecords(deck), ...added.map((wordId) => ({ id: crypto.randomUUID(), wordId }))];
    return update("decks", id, { ...data, ...withCards(deck, cards, wordIds) });
  });
}

export function saveCard(deckId, cardId, form) {
  return writeDemo(async () => {
    const term = form.term.trim();
    const definition = form.definition.trim();
    requireRule(term && definition, "Nhập thuật ngữ và định nghĩa của thẻ.");
    const deck = await getDeck(deckId);
    const cards = cardRecords(deck);
    if (cardId) {
      requireRule(cards.some((card) => card.id === cardId), "Thẻ này đã bị xóa. Hãy tải lại bộ.");
      return update("decks", deckId, {
        cards: cards.map((card) => card.id === cardId ? { ...card, term, definition } : card),
      });
    }
    if (cards.some((card) => card.id === form.id)) return deck;
    return update("decks", deckId, { cards: [...cards, { id: form.id, term, definition }] });
  });
}

export function deleteCard(deckId, cardId) {
  return writeDemo(async () => {
    const deck = await getDeck(deckId);
    const cards = cardRecords(deck);
    const card = cards.find((item) => item.id === cardId);
    if (!card) return deck;

    const wordIds = deck.wordIds.filter((id) => id !== card.wordId);
    if (card.wordId) await requireAssignmentWords(deckId, wordIds);
    return update("decks", deckId, withCards(deck, cards.filter((item) => item.id !== cardId), wordIds));
  });
}

export function deleteDeck(id) {
  return writeDemo(async () => {
    const deck = await get("decks", id);
    if (deck.deletedAt) return;
    const [assignments, attempts, logs] = await Promise.all(["assignments", "quizAttempts", "reviewLogs"].map(list));
    requireRule(![assignments, attempts].some((items) => items.some((item) => item.deckId === id)),
      "Bộ đang được dùng trong bài giao hoặc kết quả quiz. Hãy đóng bộ để giữ liên kết với các kết quả đó.");
    if (!logs.some((item) => item.deckId === id)) return remove("decks", id);

    // Keep the deck name and ID for historical vocabulary reviews.
    return update("decks", id, {
      deletedAt: new Date().toISOString(), status: "CLOSED", description: "",
      topicId: "", wordIds: [], cards: [], cardProgress: [], members: [],
    });
  });
}

export function changeMembership(deckId, learnerId, status) {
  return writeDemo(async () => {
    const [deck, learner] = await Promise.all([getDeck(deckId), getLearner(learnerId)]);
    requireRule(deck.status === "OPEN", "Bộ này đã đóng.");
    requireRule(status === "left" || learner.status === "ACTIVE", "Hồ sơ người học đang ngừng hoạt động.");
    if (isJoined(deck, learnerId) === (status === "joined")) return deck;
    const existing = deck.members.find((member) => member.learnerId === learnerId);
    const members = existing
      ? deck.members.map((member) => member.learnerId === learnerId ? { ...member, status } : member)
      : [...deck.members, { learnerId, status }];
    return update("decks", deckId, { members });
  });
}
