const { ChannelType, PermissionsBitField } = require("discord.js");
const command = require("../../src/commands/transferpins");

const BOT_MEMBER = { id: "bot-member" };
const INVOKER = { id: "invoker-member" };

// perms maps a member object to either false (denies everything), true
// (grants everything), or a Set of granted flag names. null means
// permissionsFor returns null, as discord.js does for unresolvable members.
function makeChannel(perms = new Map()) {
  return {
    type: ChannelType.GuildText,
    permissionsFor: vi.fn((who) => {
      const grant = perms.has(who) ? perms.get(who) : true;
      if (grant === null) return null;
      return {
        has: (flags) => {
          if (grant === true || grant === false) return grant;
          return [].concat(flags).every((flag) => grant.has(flag));
        },
      };
    }),
    messages: { fetchPinned: vi.fn() },
    send: vi.fn(),
  };
}

function makeInteraction({ source, target, unpin = false }) {
  return {
    client: { user: { id: "bot-user" } },
    guild: { members: { me: BOT_MEMBER } },
    member: INVOKER,
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
  it("refuses when the invoking member lacks ManageMessages on the source channel", async () => {
    const source = makeChannel(new Map([[INVOKER, false]]));
    const target = makeChannel();
    const interaction = makeInteraction({ source, target });

    await command.execute(interaction, {});

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringMatching(/don't have the necessary permissions/) })
    );
    expect(source.messages.fetchPinned).not.toHaveBeenCalled();
  });

  it("refuses gracefully when permissions can't be resolved at all (uncached member)", async () => {
    const source = makeChannel(new Map([[INVOKER, null]]));
    const target = makeChannel();
    const interaction = makeInteraction({ source, target });

    await command.execute(interaction, {});

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringMatching(/don't have the necessary permissions/) })
    );
  });

  it("refuses when the bot can't read the source channel", async () => {
    const source = makeChannel(new Map([[BOT_MEMBER, false]]));
    const target = makeChannel();
    const interaction = makeInteraction({ source, target });

    await command.execute(interaction, {});

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringMatching(/source channel/) })
    );
    expect(source.messages.fetchPinned).not.toHaveBeenCalled();
  });

  it("only requires the bot's ManageMessages on the source when unpinning", async () => {
    const readOnly = new Set([
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.ReadMessageHistory,
    ]);
    const pinned = new Map();

    const sourceOk = makeChannel(new Map([[BOT_MEMBER, readOnly]]));
    sourceOk.messages.fetchPinned.mockResolvedValue(pinned);
    const withoutUnpin = makeInteraction({ source: sourceOk, target: makeChannel(), unpin: false });
    await command.execute(withoutUnpin, {});
    expect(sourceOk.messages.fetchPinned).toHaveBeenCalled();

    const sourceBlocked = makeChannel(new Map([[BOT_MEMBER, readOnly]]));
    const withUnpin = makeInteraction({ source: sourceBlocked, target: makeChannel(), unpin: true });
    await command.execute(withUnpin, {});
    expect(withUnpin.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringMatching(/Manage Messages to unpin/) })
    );
    expect(sourceBlocked.messages.fetchPinned).not.toHaveBeenCalled();
  });

  it("refuses when the bot can't post to the target channel", async () => {
    const source = makeChannel();
    const target = makeChannel(new Map([[BOT_MEMBER, false]]));
    const interaction = makeInteraction({ source, target });

    await command.execute(interaction, {});

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringMatching(/target channel/) })
    );
    expect(source.messages.fetchPinned).not.toHaveBeenCalled();
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
