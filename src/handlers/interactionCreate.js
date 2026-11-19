function createInteractionHandler(commands, ctx) {
  return async function handleInteraction(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, ctx);
    } catch (error) {
      console.error(`Error executing command "${interaction.commandName}":`, error);
      const payload = {
        content: "There was an error executing this command!",
        ephemeral: true,
      };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload);
        } else {
          await interaction.reply(payload);
        }
      } catch (replyError) {
        console.error("Failed to send the error reply:", replyError);
      }
    }
  };
}

module.exports = createInteractionHandler;
