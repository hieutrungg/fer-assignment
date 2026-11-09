import { cardRecords, progressByCard, resolveCards, shuffleCards, studySummary } from "./flashcards";

const deck = { id: "deck-1", wordIds: ["2", "1"] };
const words = [
  { id: "1", word: "apple", meaning: "quả táo" },
  { id: "2", word: "bread", meaning: "bánh mì" },
];
const log = { deckId: "deck-1", learnerId: "linh", wordId: "1", reviewedAt: "2026-11-01T01:00:00Z", result: "remembered" };

test("reads legacy cards in vocabulary order and restores only this learner's reviews for this deck", () => {
  expect(resolveCards(deck, words).map(({ id, term }) => [id, term])).toEqual([
    ["word-2", "bread"], ["word-1", "apple"],
  ]);
  expect(progressByCard(deck, "linh", [
    log, { ...log, deckId: "deck-2", wordId: "2" }, { ...log, learnerId: "minh", wordId: "2" },
  ])).toEqual({
    "word-2": { status: "unseen", starred: false },
    "word-1": { status: "known", starred: false },
  });
});

test("preserves explicit Chưa học and stars independently of legacy reviews", () => {
  const updated = {
    ...deck,
    cardProgress: [
      { learnerId: "linh", cardId: "word-1", status: "unseen", starred: true },
      { learnerId: "minh", cardId: "word-2", status: "known" },
    ],
  };
  expect(progressByCard(updated, "linh", [log])["word-1"]).toEqual({ status: "unseen", starred: true });
  expect(progressByCard({ ...updated, cardProgress: [{ learnerId: "linh", cardId: "word-1", starred: true }] },
    "linh", [log])["word-1"]).toEqual({ status: "known", starred: true });
});

test("respects materialized card order, independent content and removal", () => {
  const updated = {
    ...deck, cards: [
      { id: "new-apple", wordId: "1", term: "An apple", definition: "Một quả táo" },
      { id: "standalone", term: "hello", definition: "xin chào" },
    ],
  };
  expect(resolveCards(updated, words).map(({ term }) => term)).toEqual(["An apple", "hello"]);
  expect(progressByCard(updated, "linh", [log])["new-apple"].status).toBe("unseen");
  expect(cardRecords({ ...deck, cards: [] })).toEqual([]);
});

test("handles empty sets and counts learning separately from unseen and known", () => {
  expect(studySummary([], {})).toEqual({ total: 0, known: 0, learning: 0, unseen: 0, percent: 0 });
  expect(studySummary([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }], {
    a: { status: "known" }, b: { status: "learning" }, c: { status: "known" },
  })).toEqual({ total: 4, known: 2, learning: 1, unseen: 1, percent: 50 });
});

test("shuffles a copy and preserves card IDs", () => {
  const ids = ["a", "b", "c"];
  const random = jest.spyOn(Math, "random").mockReturnValue(0);
  try {
    expect(shuffleCards(ids)).toEqual(["b", "c", "a"]);
    expect(ids).toEqual(["a", "b", "c"]);
  } finally {
    random.mockRestore();
  }
});
