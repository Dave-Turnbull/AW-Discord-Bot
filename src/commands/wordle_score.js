const { SlashCommandBuilder } = require("discord.js");
const { averageGuesses } = require("../services/wordle");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wordle_score")
    .setDescription("Get your Wordle score"),
  async execute(interaction, { db }) {
    const score = db.getScore(interaction.user.id);

    if (!score) {
      await interaction.reply({
        content: "You have not played Wordle yet, start guessing!.",
        ephemeral: true,
      });
      return;
    }

    const avg = averageGuesses(score.score, score.guessTotal);
    await interaction.reply({
      content: `Your Score: **${score.score}** - Total Wordles:** ${score.guessTotal}** - Average Guesses:** ${avg}**`,
      ephemeral: true,
    });
  },
};
