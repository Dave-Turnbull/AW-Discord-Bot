const providers = {
  openai: require("./providers/openai"),
  anthropic: require("./providers/anthropic"),
  none: require("./providers/none"),
};

function getProvider(aiProvider) {
  const provider = providers[aiProvider];
  if (!provider) {
    throw new Error(`Unknown AI_PROVIDER "${aiProvider}"`);
  }
  return provider;
}

async function generateReply(userMessage, config) {
  const provider = getProvider(config.aiProvider);
  try {
    return await provider.generateReply(userMessage, config);
  } catch (error) {
    console.error(`AI provider "${config.aiProvider}" call failed:`, error);
    return "How about you go outside.";
  }
}

module.exports = { generateReply, getProvider };
