const ai = require("../ai");
const { randomNamedropReply } = require("../services/mentionResponses");
const { displayNameFor } = require("../services/displayName");
const { evaluateWordleSubmission, averageGuesses } = require("../services/wordle");

// Cap quoted reply context so one long message can't flood the prompt.
const CONTEXT_MAX_CHARS = 300;
// How far back up a reply chain to walk; each hop is one REST fetch.
const CONTEXT_MAX_HOPS = 5;

// Follows message -> replied-to -> its replied-to ... up to CONTEXT_MAX_HOPS.
// Returns the chain newest-first. Replies always live in the same channel,
// so every hop fetches from the starting message's channel.
async function fetchReplyChain(message) {
  const chain = [];
  let current = message;
  while (chain.length < CONTEXT_MAX_HOPS && current.reference?.messageId) {
    const fetched = await message.channel.messages
      .fetch(current.reference.messageId)
      .catch(() => null);
    if (!fetched) break;
    chain.push(fetched);
    current = fetched;
  }
  return chain;
}

async function safeReply(message, content) {
  if (!content) return;
  try {
    await message.reply(content);
  } catch (error) {
    console.error("Failed to send a message:", error);
  }
}

async function handleMentionOrNamedrop(message, config) {
  const client = message.client;
  const mentioned = message.mentions.users.has(client.user.id);
  const repliedUserIsBot = message.mentions.repliedUser?.id === client.user.id;

  // Walk the reply chain so the AI sees the conversation it's part of.
  // Also walked when a reply arrives with no repliedUser (ping suppressed) -
  // that's the only way to tell whether a silent reply targets the bot.
  let chain = [];
  const worthFetching = mentioned || repliedUserIsBot || !message.mentions.repliedUser;
  if (message.reference?.messageId && worthFetching) {
    chain = await fetchReplyChain(message);
  }

  const repliedToBot = repliedUserIsBot || chain[0]?.author?.id === client.user.id;

  if (mentioned || repliedToBot) {
    const content = message.content
      .replace(/<@!?[0-9]+>/, "")
      .trim()
      .toLowerCase();

    let aiInput = content;
    const lines = chain
      .slice()
      .reverse() // oldest first, reading order
      .filter((m) => m.content)
      .map((m) => {
        const name =
          m.author?.id === client.user.id ? "you" : displayNameFor(m.member, m.author);
        return `${name}: "${m.content.slice(0, CONTEXT_MAX_CHARS)}"`;
      });
    if (lines.length) {
      aiInput = `(the conversation this replies to, oldest first:\n${lines.join("\n")})\n${content}`;
    }

    const reply = await ai.generateReply(aiInput, config);
    await safeReply(message, reply);
    return;
  }

  if (message.content.toLowerCase().includes("autoweenus")) {
    await safeReply(message, randomNamedropReply());
  }
}

async function handleWordleSubmission(message, db) {
  const userId = message.author.id;
  const existing = db.getScore(userId);
  const result = evaluateWordleSubmission(
    message.content,
    existing ? existing.lastGuessDay : null
  );

  switch (result.status) {
    case "not-wordle":
      return;
    case "already-played-today":
      await safeReply(message, "You've already guessed today!");
      return;
    case "already-played-later":
      await safeReply(message, "You've already guessed a later day!");
      return;
    case "cheat-mismatch":
      await safeReply(message, "Are you trying to cheat?");
      return;
    case "win": {
      const updated = db.recordGuess(userId, {
        scoreDelta: result.scoreDelta,
        day: result.day,
      });
      const avg = averageGuesses(updated.score, updated.guessTotal);
      await safeReply(
        message,
        `**Score: ${updated.score}** - You've done ${updated.guessTotal} Wordles with an average of ${avg} guesses.`
      );
      return;
    }
    case "loss": {
      const updated = db.recordGuess(userId, {
        scoreDelta: result.scoreDelta,
        day: result.day,
      });
      const avg = averageGuesses(updated.score, updated.guessTotal);
      await safeReply(
        message,
        `Where did you learn to Wordle dummy?!\n**Score: ${updated.score}** - You've done ${updated.guessTotal} Wordles with an average of ${avg} guesses.`
      );
      return;
    }
  }
}

function createMessageHandler({ db, config }) {
  return async function handleMessage(message) {
    if (message.author.id === message.client.user.id) return;

    await handleMentionOrNamedrop(message, config);
    await handleWordleSubmission(message, db);
  };
}

module.exports = createMessageHandler;
