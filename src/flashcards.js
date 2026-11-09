export const studyLabels = {
  unseen: "Chưa học",
  learning: "Chưa thuộc",
  known: "Đã thuộc",
};

const legacyCardId = (wordId) => `word-${wordId}`;

// Older decks are read as cards in their original vocabulary order.
export function cardRecords(deck) {
  return deck.cards ?? deck.wordIds.map((wordId) => ({ id: legacyCardId(wordId), wordId }));
}

export function resolveCards(deck, words) {
  const byId = new Map(words.map((word) => [word.id, word]));
  return cardRecords(deck).map((card) => {
    const word = byId.get(card.wordId);
    return {
      ...card,
      term: card.term ?? word?.word ?? "—",
      definition: card.definition ?? word?.meaning ?? "—",
      example: !card.term || card.term === word?.word ? word?.example : undefined,
    };
  });
}

export function progressByCard(deck, learnerId, logs) {
  const latestByWord = new Map();
  for (const log of logs) {
    if (log.deckId !== deck.id || log.learnerId !== learnerId) continue;
    const latest = latestByWord.get(log.wordId);
    if (!latest || Date.parse(log.reviewedAt) >= Date.parse(latest.reviewedAt)) latestByWord.set(log.wordId, log);
  }
  const saved = new Map((deck.cardProgress ?? [])
    .filter((item) => item.learnerId === learnerId)
    .map((item) => [item.cardId, item]));

  return Object.fromEntries(cardRecords(deck).map((card) => {
    const latest = card.id === legacyCardId(card.wordId) ? latestByWord.get(card.wordId) : null;
    const legacyStatus = latest ? (latest.result === "remembered" ? "known" : "learning") : "unseen";
    return [card.id, {
      status: saved.get(card.id)?.status ?? legacyStatus,
      starred: saved.get(card.id)?.starred ?? false,
    }];
  }));
}

export function studySummary(cards, progress) {
  const counts = { known: 0, learning: 0, unseen: 0 };
  for (const { id } of cards) counts[progress[id]?.status ?? "unseen"] += 1;
  const total = cards.length;
  return { ...counts, total, percent: total ? Math.floor(100 * counts.known / total) : 0 };
}

export function shuffleCards(cards) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}
