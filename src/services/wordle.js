const HEADER_PATTERN = /^Wordle ([\d,]+) (?:(\d)\/6|X\/6)/m;
const SQUARE_PATTERN = /[🟥🟨🟩🟧🟦⬜🟫⬛]/;
const SOLVED_ROW_PATTERN = /(🟩){5}|(🟧){5}/;

function looksLikeWordleResult(content) {
  return HEADER_PATTERN.test(content) && SQUARE_PATTERN.test(content);
}

function parseWordleMessage(content) {
  const headerMatch = content.match(HEADER_PATTERN);
  if (!headerMatch) return null;

  const day = parseInt(headerMatch[1].replace(/,/g, ""), 10);
  const reportedGuesses = headerMatch[2] ? parseInt(headerMatch[2], 10) : null;

  // Count grid rows, correcting for the solved row same as the original bot:
  // start at 1, +1 per emoji row, -1 back out on the row that's all green/orange.
  const lines = content.split("\n");
  let countedGuesses = 1;
  for (const line of lines) {
    if (!SQUARE_PATTERN.test(line)) continue;
    countedGuesses++;
    if (SOLVED_ROW_PATTERN.test(line)) {
      countedGuesses--;
      break;
    }
  }

  return {
    day,
    reportedGuesses,
    countedGuesses,
    won: reportedGuesses !== null,
  };
}

/**
 * @param {string} content - raw message content
 * @param {number|null|undefined} previousLastGuessDay - the user's last recorded Wordle day, if any
 */
function evaluateWordleSubmission(content, previousLastGuessDay) {
  if (!looksLikeWordleResult(content)) {
    return { status: "not-wordle" };
  }

  const parsed = parseWordleMessage(content);
  if (!parsed) {
    return { status: "not-wordle" };
  }

  const { day, reportedGuesses, countedGuesses, won } = parsed;

  if (previousLastGuessDay != null) {
    if (previousLastGuessDay === day) {
      return { status: "already-played-today", day };
    }
    if (previousLastGuessDay > day) {
      return { status: "already-played-later", day };
    }
  }

  if (won) {
    if (countedGuesses !== reportedGuesses) {
      return { status: "cheat-mismatch", day };
    }
    return { status: "win", day, guessCount: countedGuesses, scoreDelta: 7 - countedGuesses };
  }

  if (countedGuesses > 7) {
    return { status: "cheat-mismatch", day };
  }
  return { status: "loss", day, guessCount: countedGuesses, scoreDelta: 0 };
}

function averageGuesses(score, guessTotal) {
  if (!guessTotal) return 0;
  return Number(((7 * guessTotal - score) / guessTotal).toFixed(3));
}

module.exports = {
  looksLikeWordleResult,
  parseWordleMessage,
  evaluateWordleSubmission,
  averageGuesses,
};
