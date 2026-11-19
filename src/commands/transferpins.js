const {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField,
} = require("discord.js");
const { displayNameFor } = require("../services/displayName");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("transferpins")
    .setDescription("Transfers all pinned messages from one channel to another.")
    .addChannelOption((option) =>
      option
        .setName("source")
        .setDescription("The channel to get pinned messages from")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("target")
        .setDescription("The channel to send pinned messages to")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("unpin")
        .setDescription("Should the messages be unpinned from the source channel?")
        .setRequired(true)
    ),
  async execute(interaction) {
    const sourceChannel = interaction.options.getChannel("source");
    const targetChannel = interaction.options.getChannel("target");
    const shouldUnpin = interaction.options.getBoolean("unpin");
    const client = interaction.client;

    if (
      !sourceChannel.permissionsFor(client.user).has(PermissionsBitField.Flags.ManageMessages)
    ) {
      await interaction.reply({
        content:
          "I don't have the necessary permissions to unpin messages in the source channel.",
        ephemeral: true,
      });
      return;
    }

    if (
      !sourceChannel
        .permissionsFor(interaction.member.user)
        .has(PermissionsBitField.Flags.ManageMessages)
    ) {
      await interaction.reply({
        content: "You don't have the necessary permissions.",
        ephemeral: true,
      });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });
      const pinnedMessages = await sourceChannel.messages.fetchPinned();

      if (pinnedMessages.size === 0) {
        await interaction.editReply({ content: "There are no pins to transfer." });
        return;
      }

      for (const message of Array.from(pinnedMessages.values()).reverse()) {
        const messageTimestamp = new Date(message.createdTimestamp).toLocaleString("en-GB");
        await targetChannel.send({
          content: `${displayNameFor(message.member, message.author)} - ${messageTimestamp}:\n${message.content}`,
          files: message.attachments.map((attachment) => attachment.url),
        });

        if (shouldUnpin) {
          await message.unpin();
        }
      }

      await interaction.editReply({ content: "Pinned messages transferred successfully!" });
    } catch (error) {
      console.error("Error transferring pinned messages:", error);
      if (interaction.deferred) {
        await interaction.editReply({
          content: "An error occurred while transferring pinned messages.",
        });
      } else {
        await interaction.reply({
          content: "An error occurred while transferring pinned messages.",
          ephemeral: true,
        });
      }
    }
  },
};
