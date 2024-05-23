const { ApplicationCommandOptionTypes } = require("discord.js");

module.exports = () => {
  return {
    name: "avatar",
    description: "Get the avatar URL of the selected user, or your own avatar.",
    options: [
      {
        name: "target",
        type: 6,
        description: "The user whose avatar you want to see",
        required: false,
      },
    ],
    async execute(interaction) {
      const user = interaction.options.getUser("target");
      if (user) {
        await interaction.reply({
          content: `${user.username}'s avatar: ${user.displayAvatarURL({
            dynamic: true,
          })}`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `Your avatar: ${interaction.user.displayAvatarURL({
            dynamic: true,
          })}`,
          ephemeral: true,
        });
      }
    },
  };
};
