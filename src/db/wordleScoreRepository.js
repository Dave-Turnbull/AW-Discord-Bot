function createWordleScoreRepository(db) {
  const getStmt = db.prepare(
    "SELECT user_id, score, guess_total, last_guess_day FROM wordle_scores WHERE user_id = ?"
  );
  const upsertStmt = db.prepare(
    `INSERT INTO wordle_scores (user_id, score, guess_total, last_guess_day)
     VALUES (@userId, @scoreDelta, 1, @day)
     ON CONFLICT(user_id) DO UPDATE SET
       score = score + @scoreDelta,
       guess_total = guess_total + 1,
       last_guess_day = @day`
  );
  const allStmt = db.prepare(
    "SELECT user_id, score, guess_total, last_guess_day FROM wordle_scores ORDER BY score DESC"
  );

  function toModel(row) {
    if (!row) return null;
    return {
      userId: row.user_id,
      score: row.score,
      guessTotal: row.guess_total,
      lastGuessDay: row.last_guess_day,
    };
  }

  return {
    getScore(userId) {
      return toModel(getStmt.get(userId));
    },
    recordGuess(userId, { scoreDelta, day }) {
      upsertStmt.run({ userId, scoreDelta, day });
      return toModel(getStmt.get(userId));
    },
    allScoresSortedByScore() {
      return allStmt.all().map(toModel);
    },
  };
}

module.exports = { createWordleScoreRepository };
