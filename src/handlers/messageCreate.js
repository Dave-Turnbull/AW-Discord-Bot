const ai = require("../ai");
const { randomNamedropReply } = require("../services/mentionResponses");
const { evaluateWordleSubmission, averageGuesses } = require("../services/wordle");

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
  // repliedUser is only populated when the reply pinged the bot - discord.js
  // doesn't expose "is this a reply to the bot" without an extra fetch when
  // the reply suppressed the ping, so that edge case stays undetected here,
  // same as it effectively was before (the original check compared the
  // wrong field and never matched at all).
  const repliedToBot = message.mentions.repliedUser?.id === client.user.id;
  const mentioned = message.mentions.users.has(client.user.id);

  if (mentioned || repliedToBot) {
    const content = message.content
      .replace(/<@!?[0-9]+>/, "")
      .trim()
      .toLowerCase();
    const reply = await ai.generateReply(content, config);
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
