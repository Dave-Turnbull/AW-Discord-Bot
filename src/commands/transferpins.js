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

    // Resolve permissions from GuildMember objects only. permissionsFor(User)
    // silently returns null when that member isn't cached - which it rarely is
    // on servers beyond the home one, since the bot runs without the
    // GuildMembers intent.
    const me = interaction.guild.members.me;
    const { Flags } = PermissionsBitField;

    if (
      !sourceChannel.permissionsFor(interaction.member)?.has(Flags.ManageMessages)
    ) {
      await interaction.reply({
        content: "You don't have the necessary permissions.",
        ephemeral: true,
      });
      return;
    }

    // Since 2026-02-23 Discord requires the dedicated Pin Messages
    // permission to pin/unpin - Manage Messages no longer grants it.
    const sourceNeeds = [Flags.ViewChannel, Flags.ReadMessageHistory];
    if (shouldUnpin) sourceNeeds.push(Flags.PinMessages);
    if (!sourceChannel.permissionsFor(me)?.has(sourceNeeds)) {
      await interaction.reply({
        content: `I'm missing permissions in the source channel (need View Channel and Read Message History${shouldUnpin ? ", plus Pin Messages to unpin" : ""}).`,
        ephemeral: true,
      });
      return;
    }

    if (
      !targetChannel
        .permissionsFor(me)
        ?.has([Flags.ViewChannel, Flags.SendMessages, Flags.AttachFiles])
    ) {
      await interaction.reply({
        content:
          "I'm missing permissions in the target channel (need View Channel, Send Messages and Attach Files).",
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
