const command = require("../../src/commands/ping");

describe("/ping", () => {
  it("replies with Pong!", async () => {
    const interaction = { reply: vi.fn() };
    await command.execute(interaction, {});
    expect(interaction.reply).toHaveBeenCalledWith("Pong!");
  });
});
