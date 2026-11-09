import { create, list, requireRule, update, writeDemo } from "./api";
import { getDeck, getLearner, isJoined } from "./deckService";
import { listWords, getWord } from "./wordService";
import { cardRecords, progressByCard, resolveCards, studyLabels } from "../flashcards";

function summarize(logs) {
  const latest = logs.reduce((last, log) => !last || log.reviewedAt >= last.reviewedAt ? log : last, null);
  return {
    status: latest.result === "remembered" ? "mastered" : "learning",
    reviewCount: logs.length,
    lastReviewedAt: latest.reviewedAt,
  };
}

const canStudy = (deck, learner) =>
  deck.status === "OPEN" && learner.status === "ACTIVE" && isJoined(deck, learner.id);

export async function loadCardStudy(deckId, learnerId) {
  const [deck, learner, words, logs] = await Promise.all([
    getDeck(deckId), getLearner(learnerId), listWords(), list("reviewLogs"),
  ]);
  return {
    deck, allowed: canStudy(deck, learner),
    cards: resolveCards(deck, words), progress: progressByCard(deck, learnerId, logs),
  };
}

async function syncWordReview({ deckId, learnerId, wordId, status, eventId }) {
  const [allLogs, progress] = await Promise.all([list("reviewLogs"), list("learningProgress"), getWord(wordId)]);
  const matchesWord = (item) => item.learnerId === learnerId && item.wordId === wordId;
  const logs = allLogs.filter(matchesWord);
  if (!logs.some((log) => log.eventId === eventId)) {
    logs.push(await create("reviewLogs", {
      deckId, learnerId, wordId, eventId, reviewedAt: new Date().toISOString(),
      result: status === "known" ? "remembered" : "forgot",
    }));
  }

  // Recompute from the log so retrying a partial save never counts the review twice.
  const existing = progress.find(matchesWord);
  const summary = summarize(logs);
  return existing
    ? update("learningProgress", existing.id, summary)
    : create("learningProgress", { learnerId, wordId, isFavorite: false, ...summary });
}

export function saveCardProgress({ deckId, learnerId, cardId, status, starred, eventId }) {
  return writeDemo(async () => {
    const [deck, learner] = await Promise.all([getDeck(deckId), getLearner(learnerId)]);
    requireRule(canStudy(deck, learner), "Chỉ thành viên đang hoạt động của bộ đang mở mới được lưu tiến độ.");
    const card = cardRecords(deck).find((item) => item.id === cardId);
    requireRule(card, "Thẻ đang học đã bị xóa. Hãy tải lại bộ.");
    requireRule(status === undefined || Object.hasOwn(studyLabels, status), "Trạng thái thẻ không hợp lệ.");

    const items = deck.cardProgress ?? [];
    const index = items.findIndex((item) => item.learnerId === learnerId && item.cardId === cardId);
    const saved = items[index];
    if (card.wordId && status && status !== "unseen" && saved?.status !== status) {
      await syncWordReview({ deckId, learnerId, wordId: card.wordId, status, eventId });
    }
    const next = {
      learnerId, cardId, ...saved,
      ...(status !== undefined && { status }),
      ...(starred !== undefined && { starred }),
    };
    await update("decks", deckId, {
      cardProgress: index < 0 ? [...items, next] : items.map((item, i) => i === index ? next : item),
    });
    return next;
  });
}

export function toggleFavorite(learnerId, wordId) {
  return writeDemo(async () => {
    const [progress] = await Promise.all([list("learningProgress"), getLearner(learnerId), getWord(wordId)]);
    const existing = progress.find((item) => item.learnerId === learnerId && item.wordId === wordId);
    return existing
      ? update("learningProgress", existing.id, { isFavorite: !existing.isFavorite })
      : create("learningProgress", {
        learnerId, wordId, isFavorite: true, status: "learning", reviewCount: 0, lastReviewedAt: null,
      });
  });
}

export async function getStudyHistory(learnerId) {
  const [allLogs, allProgress, attempts] = await Promise.all(
    ["reviewLogs", "learningProgress", "quizAttempts"].map(list)
  );
  const owned = (item) => item.learnerId === learnerId;
  const logs = allLogs.filter(owned).sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  const progress = new Map(allProgress.filter(owned).map((item) => [item.wordId, item]));
  const logsByWord = new Map();
  for (const log of logs) {
    if (!logsByWord.has(log.wordId)) logsByWord.set(log.wordId, []);
    logsByWord.get(log.wordId).push(log);
  }

  // Include reviews immediately even if the progress write is awaiting a retry.
  for (const [wordId, wordLogs] of logsByWord) {
    progress.set(wordId, { ...progress.get(wordId), wordId, ...summarize(wordLogs) });
  }

  return {
    logs, progress: [...progress.values()],
    attempts: attempts.filter(owned).sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
  };
}
