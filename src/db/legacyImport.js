const fs = require("fs");

// One-time import of the pre-SQLite scoreData.json format:
// { "<userId>": { "score": n, "lastGuessDay": n, "guessTotal": n }, ... }
// The source file is renamed to <file>.imported afterwards so the import
// never runs twice and the original data is kept.
function importLegacyScores(db, jsonPath) {
  if (!jsonPath || !fs.existsSync(jsonPath)) {
    return { imported: 0, skipped: false };
  }

  let legacy;
  try {
    legacy = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch (error) {
    console.error(`Legacy score file ${jsonPath} is unreadable, skipping import:`, error);
    return { imported: 0, skipped: true };
  }

  const insert = db.prepare(
    `INSERT OR IGNORE INTO wordle_scores (user_id, score, guess_total, last_guess_day)
     VALUES (?, ?, ?, ?)`
  );

  let imported = 0;
  const importAll = db.transaction(() => {
    for (const [userId, row] of Object.entries(legacy)) {
      if (!row || typeof row !== "object") continue;
      const result = insert.run(
        userId,
        Number(row.score) || 0,
        Number(row.guessTotal) || 0,
        Number(row.lastGuessDay) || 0
      );
      imported += result.changes;
    }
  });
  importAll();

  fs.renameSync(jsonPath, `${jsonPath}.imported`);
  console.log(`Imported ${imported} legacy wordle score(s) from ${jsonPath}`);
  return { imported, skipped: false };
}

module.exports = { importLegacyScores };
