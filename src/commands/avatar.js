const { SlashCommandBuilder } = require("discord.js");
const { displayNameFor } = require("../services/displayName");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Get the avatar URL of the selected user, or your own avatar.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user whose avatar you want to see")
        .setRequired(false)
    ),
  async execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const isSelf = !targetUser || targetUser.id === interaction.user.id;
    const user = targetUser || interaction.user;
    const member = isSelf ? interaction.member : interaction.options.getMember("target");
    const label = isSelf ? "Your" : `${displayNameFor(member, user)}'s`;

    await interaction.reply({
      content: `${label} avatar: ${user.displayAvatarURL({ dynamic: true })}`,
      ephemeral: true,
    });
  },
};
