const path = require("path");

const AI_PROVIDERS = ["openai", "anthropic", "none"];

function loadConfig(env = process.env) {
  const discordToken = env.DISCORD_TOKEN;
  if (!discordToken) {
    throw new Error("DISCORD_TOKEN is required");
  }

  const aiProvider = env.AI_PROVIDER || "none";
  if (!AI_PROVIDERS.includes(aiProvider)) {
    throw new Error(
      `AI_PROVIDER must be one of ${AI_PROVIDERS.join(", ")}, got "${aiProvider}"`
    );
  }

  if (aiProvider === "openai" && !env.OPENAI_API_KEY) {
    throw new Error("AI_PROVIDER=openai requires OPENAI_API_KEY");
  }
  if (aiProvider === "anthropic" && !env.ANTHROPIC_API_KEY) {
    throw new Error("AI_PROVIDER=anthropic requires ANTHROPIC_API_KEY");
  }

  return {
    discordToken,
    aiProvider,
    openaiApiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL || "gpt-4o-mini",
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    anthropicModel: env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001",
    dbPath: env.DB_PATH || path.join(__dirname, "..", "data", "bot.sqlite3"),
  };
}

module.exports = { loadConfig, AI_PROVIDERS };
