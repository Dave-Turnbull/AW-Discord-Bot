const Anthropic = require("@anthropic-ai/sdk");
const { SYSTEM_PROMPT } = require("../systemPrompt");

let cachedClient = null;

function getClient(config) {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return cachedClient;
}

async function generateReply(userMessage, config, deps = {}) {
  const client = deps.client || getClient(config);
  const response = await client.messages.create({
    model: config.anthropicModel,
    max_tokens: 60,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });
  const textBlock = response.content?.find((block) => block.type === "text");
  return textBlock?.text?.trim() || "I'm done talking.";
}

module.exports = { generateReply };
