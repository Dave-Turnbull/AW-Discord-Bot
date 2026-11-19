const { SlashCommandBuilder } = require("discord.js");
const { averageGuesses } = require("../services/wordle");
const { displayNameFor } = require("../services/displayName");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wordle_leaderboard")
    .setDescription("Show the Wordle Leaderboard"),
  async execute(interaction, { db }) {
    const scores = db.allScoresSortedByScore();
    let replyMessage = "**WORDLE GLOBAL LEADERBOARD**\n";

    try {
      const users = await Promise.all(
        scores.map((entry) => interaction.client.users.fetch(entry.userId))
      );
      // Best-effort: a guild-member fetch gives the server nickname when the
      // user is still a member here; falls back to their global display name
      // otherwise (e.g. scores from a different server, or they've left).
      const members = interaction.guild
        ? await Promise.all(
            scores.map((entry) => interaction.guild.members.fetch(entry.userId).catch(() => null))
          )
        : scores.map(() => null);

      scores.forEach((entry, index) => {
        const user = users[index];
        if (!user) return;
        const avg = averageGuesses(entry.score, entry.guessTotal);
        const name = displayNameFor(members[index], user);
        replyMessage += `**${name}** - Score: **${entry.score}** - Total Wordles:** ${entry.guessTotal}** - Average Guesses:** ${avg}**\n`;
      });

      await interaction.reply(replyMessage);
    } catch (error) {
      console.error("Error fetching user data:", error);
      await interaction.reply({
        content: "Couldn't build the leaderboard right now.",
        ephemeral: true,
      });
    }
  },
};
