module.exports = (scoreData, client) => ({
  name: "wordle_leaderboard",
  description: "Show the Wordle Leaderboard",
  async execute(interaction) {
    let replyMessage = "**WORDLE GLOBAL LEADERBOARD**\n";

    // Convert the scoreData object into an array of [userId, score] pairs
    const scoreArray = Object.entries(scoreData);

    // Sort the scoreArray based on the score in descending order
    scoreArray.sort((a, b) => b[1].score - a[1].score);

    // Fetch user data for all users in scoreArray
    const fetchPromises = scoreArray.map(([userId]) =>
      client.users.fetch(userId)
    );

    try {
      const users = await Promise.all(fetchPromises);
      for (const [index, [userId, data]] of scoreArray.entries()) {
        const user = users[index]; // User object from the fetched users
        const score = data.score;
        const guessTotal = data.guessTotal;

        if (user) {
          replyMessage += `**${
            user.username
          }** - Score: **${score}** - Total Wordles:** ${guessTotal}** - Average Guesses:** ${Number(
            ((7 * guessTotal - score) / guessTotal).toFixed(3)
          )}**\n`;
        }
      }

      await interaction.reply(replyMessage);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  },
});
