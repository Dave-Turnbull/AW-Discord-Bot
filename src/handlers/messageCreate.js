const ai = require("../ai");
const { randomNamedropReply } = require("../services/mentionResponses");
const { displayNameFor } = require("../services/displayName");
const { evaluateWordleSubmission, averageGuesses } = require("../services/wordle");

// Cap quoted reply context so one long message can't flood the prompt.
const CONTEXT_MAX_CHARS = 300;

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

  // Fetch the replied-to message so the AI sees what the reply is about.
  // Also fetched when a reply arrives with no repliedUser (ping suppressed) -
  // that's the only way to tell whether a silent reply targets the bot.
  let referenced = null;
  const worthFetching = mentioned || repliedUserIsBot || !message.mentions.repliedUser;
  if (message.reference?.messageId && worthFetching) {
    referenced = await message.channel.messages
      .fetch(message.reference.messageId)
      .catch(() => null);
  }

  const repliedToBot = repliedUserIsBot || referenced?.author?.id === client.user.id;

  if (mentioned || repliedToBot) {
    const content = message.content
      .replace(/<@!?[0-9]+>/, "")
      .trim()
      .toLowerCase();

    let aiInput = content;
    if (referenced?.content) {
      const quoted = referenced.content.slice(0, CONTEXT_MAX_CHARS);
      const intro =
        referenced.author?.id === client.user.id
          ? "they are replying to your earlier message"
          : `they are replying to ${displayNameFor(referenced.member, referenced.author)}'s message`;
      aiInput = `(${intro}: "${quoted}")\n${content}`;
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
