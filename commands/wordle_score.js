module.exports = (scoreData, client) => ({
  name: "wordle_score",
  description: "Get your Wordle score",
  async execute(interaction) {
    const userId = interaction.user.id;

    if (scoreData[userId]) {
      const data = scoreData[userId];
      const score = data.score;
      const guessTotal = data.guessTotal;
      const averageGuesses = Number(
        ((7 * guessTotal - score) / guessTotal).toFixed(3)
      );

      const replyMessage = `Your Score: **${score}** - Total Wordles:** ${guessTotal}** - Average Guesses:** ${averageGuesses}**`;

      // Reply to the interaction and only the user who issued the command can see the reply
      await interaction.reply({ content: replyMessage, ephemeral: true });
    } else {
      await interaction.reply({
        content: "You have not played Wordle yet, start guessing!.",
        ephemeral: true,
      });
    }
  },
});
