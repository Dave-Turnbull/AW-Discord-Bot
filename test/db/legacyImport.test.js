const fs = require("fs");
const os = require("os");
const path = require("path");
const { openDb } = require("../../src/db");
const { importLegacyScores } = require("../../src/db/legacyImport");
const { createWordleScoreRepository } = require("../../src/db/wordleScoreRepository");

describe("importLegacyScores", () => {
  let dir;
  let db;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-import-"));
    db = openDb(":memory:");
  });

  afterEach(() => {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("returns zero when the legacy file does not exist", () => {
    const result = importLegacyScores(db, path.join(dir, "scoreData.json"));
    expect(result).toEqual({ imported: 0, skipped: false });
  });

  it("imports legacy rows and renames the source file", () => {
    const jsonPath = path.join(dir, "scoreData.json");
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({
        "111": { score: 42, lastGuessDay: 900, guessTotal: 10 },
        "222": { score: 5, lastGuessDay: 901, guessTotal: 2 },
      })
    );

    const result = importLegacyScores(db, jsonPath);
    expect(result.imported).toBe(2);
    expect(fs.existsSync(jsonPath)).toBe(false);
    expect(fs.existsSync(`${jsonPath}.imported`)).toBe(true);

    const repo = createWordleScoreRepository(db);
    expect(repo.getScore("111")).toEqual({
      userId: "111",
      score: 42,
      guessTotal: 10,
      lastGuessDay: 900,
    });
    expect(repo.getScore("222").score).toBe(5);
  });

  it("does not overwrite rows that already exist", () => {
    const repo = createWordleScoreRepository(db);
    repo.recordGuess("111", { scoreDelta: 3, day: 950 });

    const jsonPath = path.join(dir, "scoreData.json");
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({ "111": { score: 42, lastGuessDay: 900, guessTotal: 10 } })
    );

    const result = importLegacyScores(db, jsonPath);
    expect(result.imported).toBe(0);
    expect(repo.getScore("111").score).toBe(3);
  });

  it("skips an unreadable file without renaming it", () => {
    const jsonPath = path.join(dir, "scoreData.json");
    fs.writeFileSync(jsonPath, "not json {");

    const result = importLegacyScores(db, jsonPath);
    expect(result).toEqual({ imported: 0, skipped: true });
    expect(fs.existsSync(jsonPath)).toBe(true);
  });

  it("ignores malformed entries and coerces missing fields to zero", () => {
    const jsonPath = path.join(dir, "scoreData.json");
    fs.writeFileSync(
      jsonPath,
      JSON.stringify({ "111": { score: "7" }, "222": null, "333": "bad" })
    );

    const result = importLegacyScores(db, jsonPath);
    expect(result.imported).toBe(1);

    const repo = createWordleScoreRepository(db);
    expect(repo.getScore("111")).toEqual({
      userId: "111",
      score: 7,
      guessTotal: 0,
      lastGuessDay: 0,
    });
  });
});
