const {
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
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
        ?.has([Flags.ViewChannel, Flags.SendMessages])
    ) {
      await interaction.reply({
        content:
          "I'm missing permissions in the target channel (need View Channel and Send Messages).",
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
        const attachments = message.attachments.map((attachment) => attachment);
        // First image renders inside the card. Nothing is re-uploaded:
        // other attachments (videos, files) are listed by name, reachable
        // via the jump link - raw CDN links would expire anyway.
        const image = attachments.find((a) => a.contentType?.startsWith("image/"));
        const others = attachments.filter((a) => a !== image);

        const embed = new EmbedBuilder()
          .setColor(0x5865f2)
          .setAuthor({
            name: displayNameFor(message.member, message.author),
            iconURL: message.author?.displayAvatarURL?.() ?? undefined,
          })
          .setTimestamp(message.createdTimestamp);

        const description = [
          // Embed descriptions cap at 4096 chars; keep room for the rest.
          message.content ? message.content.slice(0, 4000) : null,
          others.length
            ? `📎 ${others.map((a) => a.name ?? "attachment").join(", ")} - see original`
            : null,
          message.url ? `[Jump to original](${message.url})` : null,
        ]
          .filter(Boolean)
          .join("\n\n");
        if (description) embed.setDescription(description);
        if (image) embed.setImage(image.url);

        await targetChannel.send({ embeds: [embed] });

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
