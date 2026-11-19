const { openDb } = require("../../src/db");
const { createWordleScoreRepository } = require("../../src/db/wordleScoreRepository");

describe("wordleScoreRepository", () => {
  let rawDb;
  let repo;

  beforeEach(() => {
    rawDb = openDb(":memory:");
    repo = createWordleScoreRepository(rawDb);
  });

  afterEach(() => {
    rawDb.close();
  });

  it("returns null for a user with no recorded score", () => {
    expect(repo.getScore("nobody")).toBeNull();
  });

  it("creates a new row on the first recorded guess", () => {
    const updated = repo.recordGuess("user-1", { scoreDelta: 4, day: 1234 });
    expect(updated).toEqual({
      userId: "user-1",
      score: 4,
      guessTotal: 1,
      lastGuessDay: 1234,
    });
  });

  it("accumulates score and guessTotal across multiple guesses", () => {
    repo.recordGuess("user-1", { scoreDelta: 4, day: 1234 });
    const updated = repo.recordGuess("user-1", { scoreDelta: 6, day: 1235 });
    expect(updated).toEqual({
      userId: "user-1",
      score: 10,
      guessTotal: 2,
      lastGuessDay: 1235,
    });
  });

  it("records a loss (zero delta) without changing score but incrementing guessTotal", () => {
    repo.recordGuess("user-1", { scoreDelta: 4, day: 1234 });
    const updated = repo.recordGuess("user-1", { scoreDelta: 0, day: 1235 });
    expect(updated.score).toBe(4);
    expect(updated.guessTotal).toBe(2);
    expect(updated.lastGuessDay).toBe(1235);
  });

  it("sorts allScoresSortedByScore descending by score", () => {
    repo.recordGuess("low", { scoreDelta: 1, day: 1 });
    repo.recordGuess("high", { scoreDelta: 6, day: 1 });
    repo.recordGuess("mid", { scoreDelta: 3, day: 1 });

    const all = repo.allScoresSortedByScore();
    expect(all.map((entry) => entry.userId)).toEqual(["high", "mid", "low"]);
  });
});
