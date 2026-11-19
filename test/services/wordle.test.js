const {
  looksLikeWordleResult,
  evaluateWordleSubmission,
  averageGuesses,
} = require("../../src/services/wordle");

const WIN_IN_3 = `Wordle 1,234 3/6

⬛🟨⬛⬛⬛
⬛🟨🟨⬛⬛
🟩🟩🟩🟩🟩`;

const WIN_IN_1 = `Wordle 999 1/6

🟩🟩🟩🟩🟩`;

const LOSS_X6 = `Wordle 999 X/6

⬛🟨⬛⬛⬛
⬛🟨🟨⬛⬛
⬛🟨🟨🟨⬛
🟨🟨🟨🟨⬛
🟨🟨🟨🟨🟨
🟨🟨🟨🟨⬜`;

const CHEAT_MISMATCH = `Wordle 999 2/6

⬛🟨⬛⬛⬛
⬛🟨🟨⬛⬛
🟩🟩🟩🟩🟩`;

describe("looksLikeWordleResult", () => {
  it("recognizes a real wordle share", () => {
    expect(looksLikeWordleResult(WIN_IN_3)).toBe(true);
  });

  it("rejects unrelated messages", () => {
    expect(looksLikeWordleResult("just chatting about wordle")).toBe(false);
  });

  it("rejects a header with no emoji grid", () => {
    expect(looksLikeWordleResult("Wordle 999 3/6")).toBe(false);
  });
});

describe("evaluateWordleSubmission", () => {
  it("returns not-wordle for unrelated content", () => {
    expect(evaluateWordleSubmission("hello there", null)).toEqual({ status: "not-wordle" });
  });

  it("scores a win, handling comma-separated day numbers", () => {
    const result = evaluateWordleSubmission(WIN_IN_3, null);
    expect(result).toEqual({ status: "win", day: 1234, guessCount: 3, scoreDelta: 4 });
  });

  it("scores a first-guess win at the max delta", () => {
    const result = evaluateWordleSubmission(WIN_IN_1, null);
    expect(result).toEqual({ status: "win", day: 999, guessCount: 1, scoreDelta: 6 });
  });

  it("scores a loss with zero score delta but records the attempt", () => {
    const result = evaluateWordleSubmission(LOSS_X6, null);
    expect(result).toEqual({ status: "loss", day: 999, guessCount: 7, scoreDelta: 0 });
  });

  it("flags a mismatch between the reported and counted guesses as cheating", () => {
    const result = evaluateWordleSubmission(CHEAT_MISMATCH, null);
    expect(result).toEqual({ status: "cheat-mismatch", day: 999 });
  });

  it("rejects a resubmission for the same day", () => {
    const result = evaluateWordleSubmission(WIN_IN_3, 1234);
    expect(result).toEqual({ status: "already-played-today", day: 1234 });
  });

  it("rejects a submission for a day earlier than the last recorded one", () => {
    const result = evaluateWordleSubmission(WIN_IN_3, 1235);
    expect(result).toEqual({ status: "already-played-later", day: 1234 });
  });

  it("allows a submission for a day after the last recorded one", () => {
    const result = evaluateWordleSubmission(WIN_IN_3, 1233);
    expect(result.status).toBe("win");
  });
});

describe("averageGuesses", () => {
  it("computes the average from score/guessTotal", () => {
    expect(averageGuesses(4, 1)).toBe(3);
  });

  it("returns 0 when no games have been played", () => {
    expect(averageGuesses(0, 0)).toBe(0);
  });
});
