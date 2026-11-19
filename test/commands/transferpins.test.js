const { ChannelType } = require("discord.js");
const command = require("../../src/commands/transferpins");

function makeChannel({ botCanManage = true, userCanManage = true } = {}) {
  return {
    type: ChannelType.GuildText,
    permissionsFor: vi.fn((who) => ({
      has: () => (who === "bot-user" ? botCanManage : userCanManage),
    })),
    messages: { fetchPinned: vi.fn() },
    send: vi.fn(),
  };
}

function makeInteraction({ source, target, unpin = false }) {
  return {
    client: { user: "bot-user" },
    member: { user: "member-user" },
    options: {
      getChannel: (name) => (name === "source" ? source : target),
      getBoolean: () => unpin,
    },
    deferReply: vi.fn(),
    reply: vi.fn(),
    editReply: vi.fn(),
    deferred: false,
  };
}

describe("/transferpins", () => {
  it("refuses when the bot lacks ManageMessages on the source channel", async () => {
    const source = makeChannel({ botCanManage: false });
    const target = makeChannel();
    const interaction = makeInteraction({ source, target });

    await command.execute(interaction, {});

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringMatching(/I don't have/) })
    );
    expect(source.messages.fetchPinned).not.toHaveBeenCalled();
  });

  it("refuses when the invoking member lacks ManageMessages on the source channel", async () => {
    const source = makeChannel({ userCanManage: false });
    const target = makeChannel();
    const interaction = makeInteraction({ source, target });

    await command.execute(interaction, {});

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringMatching(/don't have the necessary permissions/) })
    );
  });

  it("reports when there are no pins to transfer", async () => {
    const source = makeChannel();
    source.messages.fetchPinned.mockResolvedValue(new Map());
    const target = makeChannel();
    const interaction = makeInteraction({ source, target });

    await command.execute(interaction, {});

    expect(interaction.editReply).toHaveBeenCalledWith({ content: "There are no pins to transfer." });
  });

  it("copies each pinned message to the target channel using the author's server nickname, and unpins on request", async () => {
    const source = makeChannel();
    const pinned = new Map([
      [
        "m1",
        {
          author: { username: "dave_raw_username", displayName: "DaveGlobal" },
          member: { displayName: "DaveNickname" },
          createdTimestamp: Date.parse("2026-01-01"),
          content: "look at this",
          attachments: { map: () => [] },
          unpin: vi.fn(),
        },
      ],
    ]);
    source.messages.fetchPinned.mockResolvedValue(pinned);
    const target = makeChannel();
    const interaction = makeInteraction({ source, target, unpin: true });

    await command.execute(interaction, {});

    const sentContent = target.send.mock.calls[0][0].content;
    expect(sentContent).toContain("DaveNickname");
    expect(sentContent).toContain("look at this");
    expect(sentContent).not.toContain("dave_raw_username");
    expect([...pinned.values()][0].unpin).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith({
      content: "Pinned messages transferred successfully!",
    });
  });

  it("falls back to the author's global display name when they aren't a cached guild member", async () => {
    const source = makeChannel();
    const pinned = new Map([
      [
        "m1",
        {
          author: { username: "dave_raw_username", displayName: "DaveGlobal" },
          member: null,
          createdTimestamp: Date.parse("2026-01-01"),
          content: "look at this",
          attachments: { map: () => [] },
          unpin: vi.fn(),
        },
      ],
    ]);
    source.messages.fetchPinned.mockResolvedValue(pinned);
    const target = makeChannel();
    const interaction = makeInteraction({ source, target, unpin: false });

    await command.execute(interaction, {});

    const sentContent = target.send.mock.calls[0][0].content;
    expect(sentContent).toContain("DaveGlobal");
    expect(sentContent).not.toContain("dave_raw_username");
  });

  it("reports an error if fetching pinned messages fails after deferring", async () => {
    const source = makeChannel();
    source.messages.fetchPinned.mockRejectedValue(new Error("discord is down"));
    const target = makeChannel();
    const interaction = makeInteraction({ source, target });
    interaction.deferReply = vi.fn(async () => {
      interaction.deferred = true;
    });

    await command.execute(interaction, {});

    expect(interaction.editReply).toHaveBeenCalledWith({
      content: "An error occurred while transferring pinned messages.",
    });
  });
});
