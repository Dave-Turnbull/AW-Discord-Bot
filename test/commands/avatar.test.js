const command = require("../../src/commands/avatar");

function makeUser(id, username, displayName) {
  return {
    id,
    username,
    displayName: displayName ?? username,
    displayAvatarURL: () => `https://cdn.example/${id}.png`,
  };
}

describe("/avatar", () => {
  it("shows the target's server nickname when one is set", async () => {
    const target = makeUser("2", "other_raw", "OtherGlobal");
    const interaction = {
      user: makeUser("1", "me"),
      member: { displayName: "MyNickname" },
      options: {
        getUser: vi.fn().mockReturnValue(target),
        getMember: vi.fn().mockReturnValue({ displayName: "OtherNickname" }),
      },
      reply: vi.fn(),
    };

    await command.execute(interaction, {});

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "OtherNickname's avatar: https://cdn.example/2.png",
      ephemeral: true,
    });
  });

  it("falls back to the target's global display name when there's no guild member", async () => {
    const target = makeUser("2", "other_raw", "OtherGlobal");
    const interaction = {
      user: makeUser("1", "me"),
      member: null,
      options: {
        getUser: vi.fn().mockReturnValue(target),
        getMember: vi.fn().mockReturnValue(null),
      },
      reply: vi.fn(),
    };

    await command.execute(interaction, {});

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "OtherGlobal's avatar: https://cdn.example/2.png",
      ephemeral: true,
    });
  });

  it("never renders a raw username when a display name is available", async () => {
    const target = makeUser("2", "raw_username_should_not_appear", "NiceName");
    const interaction = {
      user: makeUser("1", "me"),
      member: null,
      options: {
        getUser: vi.fn().mockReturnValue(target),
        getMember: vi.fn().mockReturnValue(null),
      },
      reply: vi.fn(),
    };

    await command.execute(interaction, {});

    const content = interaction.reply.mock.calls[0][0].content;
    expect(content).not.toContain("raw_username_should_not_appear");
  });

  it("falls back to the caller's own avatar when no target is given", async () => {
    const interaction = {
      user: makeUser("1", "me", "MyGlobal"),
      member: { displayName: "MyNickname" },
      options: { getUser: vi.fn().mockReturnValue(null), getMember: vi.fn() },
      reply: vi.fn(),
    };

    await command.execute(interaction, {});

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Your avatar: https://cdn.example/1.png",
      ephemeral: true,
    });
  });
});
