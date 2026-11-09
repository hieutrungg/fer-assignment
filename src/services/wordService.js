import { create, get, list, remove, requireRule, update, writeDemo } from "./api";

export const levels = ["A1", "A2", "B1"];
export const listTopics = () => list("topics");
export const listWords = () => list("words");
export const getWord = (id) => get("words", id);

export function saveWord(id, word) {
  return writeDemo(async () => {
    requireRule(word.word && word.meaning, "Nhập từ tiếng Anh và nghĩa tiếng Việt.");
    requireRule(levels.includes(word.level), "Chọn trình độ hợp lệ.");
    requireRule((await listTopics()).some(({ id }) => id === word.topicId), "Chọn chủ đề hợp lệ.");
    if (id) {
      const decks = await list("decks");
      requireRule(!decks.some((deck) => deck.wordIds.includes(id) && deck.topicId !== word.topicId),
        "Từ này đang nằm trong một bộ flashcard thuộc chủ đề khác. Hãy bỏ từ khỏi bộ trước khi đổi chủ đề.");
      return update("words", id, word);
    }
    return create("words", word);
  });
}

export function deleteWord(id) {
  return writeDemo(async () => {
    const [decks, questions, logs, progress] = await Promise.all(
      ["decks", "questions", "reviewLogs", "learningProgress"].map(list)
    );
    const references = [
      decks.some((deck) => deck.wordIds.includes(id)) && "bộ flashcard",
      questions.some((item) => item.wordId === id) && "ngân hàng câu hỏi",
      logs.some((item) => item.wordId === id) && "nhật ký ôn",
      progress.some((item) => item.wordId === id) && "tiến độ học",
    ].filter(Boolean);
    requireRule(!references.length, `Không thể xóa vì từ đang được dùng trong: ${references.join(", ")}.`);
    return remove("words", id);
  });
}

export function saveTopic(id, topic) {
  return writeDemo(() => {
    requireRule(topic.name, "Nhập tên chủ đề.");
    return id ? update("topics", id, topic) : create("topics", topic);
  });
}

export function deleteTopic(id) {
  return writeDemo(async () => {
    const [words, decks] = await Promise.all([listWords(), list("decks")]);
    requireRule(!words.some((word) => word.topicId === id) &&
      !decks.some((deck) => deck.topicId === id), "Không thể xóa chủ đề còn từ vựng hoặc bộ flashcard.");
    return remove("topics", id);
  });
}
