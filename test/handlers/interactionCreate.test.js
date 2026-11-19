const createInteractionHandler = require("../../src/handlers/interactionCreate");

function makeInteraction({ commandName = "ping", isChatInputCommand = true } = {}) {
  return {
    isChatInputCommand: () => isChatInputCommand,
    commandName,
    deferred: false,
    replied: false,
    reply: vi.fn(),
    editReply: vi.fn(),
  };
}

describe("interactionCreate handler", () => {
  it("ignores interactions that aren't chat input commands", async () => {
    const execute = vi.fn();
    const handler = createInteractionHandler(new Map([["ping", { execute }]]), {});
    await handler(makeInteraction({ isChatInputCommand: false }));
    expect(execute).not.toHaveBeenCalled();
  });

  it("ignores unknown command names", async () => {
    const handler = createInteractionHandler(new Map(), {});
    const interaction = makeInteraction({ commandName: "nope" });
    await expect(handler(interaction)).resolves.not.toThrow();
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("dispatches to the matching command with the shared ctx", async () => {
    const execute = vi.fn();
    const ctx = { db: "fake-db" };
    const handler = createInteractionHandler(new Map([["ping", { execute }]]), ctx);
    const interaction = makeInteraction();

    await handler(interaction);

    expect(execute).toHaveBeenCalledWith(interaction, ctx);
  });

  it("replies with a generic error if the command throws before replying", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("boom"));
    const handler = createInteractionHandler(new Map([["ping", { execute }]]), {});
    const interaction = makeInteraction();

    await handler(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "There was an error executing this command!",
      ephemeral: true,
    });
  });

  it("edits the reply instead if the command had already deferred", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("boom"));
    const handler = createInteractionHandler(new Map([["ping", { execute }]]), {});
    const interaction = makeInteraction();
    interaction.deferred = true;

    await handler(interaction);

    expect(interaction.editReply).toHaveBeenCalled();
    expect(interaction.reply).not.toHaveBeenCalled();
  });
});
