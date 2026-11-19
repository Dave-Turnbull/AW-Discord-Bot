const OpenAI = require("openai");
const { SYSTEM_PROMPT } = require("../systemPrompt");

let cachedClient = null;

function getClient(config) {
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey: config.openaiApiKey });
  }
  return cachedClient;
}

async function generateReply(userMessage, config, deps = {}) {
  const client = deps.client || getClient(config);
  const completion = await client.chat.completions.create({
    model: config.openaiModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    max_tokens: 60,
    temperature: 0.7,
  });
  return completion.choices?.[0]?.message?.content?.trim() || "I'm done talking.";
}

module.exports = { generateReply };
