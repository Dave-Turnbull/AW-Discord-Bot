const { ChannelType, PermissionsBitField } = require("discord.js");

module.exports = (scoreData, client) => {
  return {
    name: "transferpins",
    description: "Transfers all pinned messages from one channel to another.",
    options: [
      {
        name: "source",
        type: 7, // Channel type
        description: "The channel to get pinned messages from",
        required: true,
      },
      {
        name: "target",
        type: 7, // Channel type
        description: "The channel to send pinned messages to",
        required: true,
      },
      {
        name: "unpin",
        type: 5, // Boolean type
        description: "Should the messages be unpinned from the source channel?",
        required: true,
      },
    ],
    async execute(interaction) {
      // Get the source and target channels
      const sourceChannel = interaction.options.getChannel("source");
      const targetChannel = interaction.options.getChannel("target");
      const shouldUnpin = interaction.options.getBoolean("unpin");

      // Check if the channels are text channels
      if (
        sourceChannel.type !== ChannelType.GuildText ||
        targetChannel.type !== ChannelType.GuildText
      ) {
        await interaction.reply({
          content: "Both source and target channels must be text channels.",
          ephemeral: true,
        });
        return;
      }

      if (
        !sourceChannel
          .permissionsFor(client.user)
          .has(PermissionsBitField.Flags.ManageMessages)
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
          .permissionsFor(interaction?.member?.user)
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
        // Get the pinned messages in the source channel
        const pinnedMessages = await sourceChannel.messages.fetchPinned();

        if (pinnedMessages.size > 0) {
          // Loop through the pinned messages
          for (const message of Array.from(pinnedMessages.values()).reverse()) {
            const messageTimestamp = new Date(
              message.createdTimestamp
            ).toLocaleString("en-GB");
            // Send each pinned message to the target channel
            await targetChannel.send({
              content: `${message.author.username} - ${messageTimestamp}:\n${message.content}`,
              // If the message has attachments, include them
              files: message.attachments.map((attachment) => attachment.url),
            });

            // If the 'unpin' option was selected, unpin the message from the source channel
            if (shouldUnpin) {
              await message.unpin();
            }
          }

          // Reply to the command interaction
          await interaction.editReply({
            content: "Pinned messages transferred successfully!",
            ephemeral: true,
          });
        } else {
          await interaction.editReply({
            content: "There are no pins to transfer.",
            ephemeral: true,
          });
        }
      } catch (error) {
        console.error("Error transferring pinned messages:", error);
        await interaction.reply({
          content: "An error occurred while transferring pinned messages.",
          ephemeral: true,
        });
      }
    },
  };
};
