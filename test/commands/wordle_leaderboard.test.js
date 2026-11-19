const command = require("../../src/commands/wordle_leaderboard");

describe("/wordle_leaderboard", () => {
  it("defers, then lists users by server nickname, in score order, with computed averages", async () => {
    const scores = [
      { userId: "1", score: 10, guessTotal: 2, lastGuessDay: 5 },
      { userId: "2", score: 4, guessTotal: 1, lastGuessDay: 3 },
    ];
    const db = { allScoresSortedByScore: vi.fn().mockReturnValue(scores) };
    const users = {
      1: { username: "alice_raw", displayName: "AliceGlobal" },
      2: { username: "bob_raw", displayName: "BobGlobal" },
    };
    const members = {
      1: { displayName: "AliceNickname" },
      2: { displayName: "BobNickname" },
    };
    const interaction = {
      client: { users: { fetch: vi.fn((id) => Promise.resolve(users[id])) } },
      guild: { members: { fetch: vi.fn((id) => Promise.resolve(members[id])) } },
      deferReply: vi.fn(),
      editReply: vi.fn(),
    };

    await command.execute(interaction, { db });

    expect(interaction.deferReply).toHaveBeenCalled();
    const message = interaction.editReply.mock.calls[0][0];
    expect(message).toContain("**AliceNickname** - Score: **10**");
    expect(message).toContain("**BobNickname** - Score: **4**");
    expect(message.indexOf("AliceNickname")).toBeLessThan(message.indexOf("BobNickname"));
    expect(message).not.toContain("alice_raw");
    expect(message).not.toContain("bob_raw");
  });

  it("falls back to global display name outside a guild (or when the member fetch fails)", async () => {
    const scores = [{ userId: "1", score: 10, guessTotal: 2, lastGuessDay: 5 }];
    const db = { allScoresSortedByScore: vi.fn().mockReturnValue(scores) };
    const interaction = {
      client: {
        users: {
          fetch: vi.fn().mockResolvedValue({ username: "alice_raw", displayName: "AliceGlobal" }),
        },
      },
      guild: undefined,
      deferReply: vi.fn(),
      editReply: vi.fn(),
    };

    await command.execute(interaction, { db });

    const message = interaction.editReply.mock.calls[0][0];
    expect(message).toContain("**AliceGlobal**");
    expect(message).not.toContain("alice_raw");
  });

  it("keeps rows for users that can no longer be fetched (deleted accounts)", async () => {
    const scores = [
      { userId: "1", score: 10, guessTotal: 2, lastGuessDay: 5 },
      { userId: "gone", score: 4, guessTotal: 1, lastGuessDay: 3 },
    ];
    const db = { allScoresSortedByScore: vi.fn().mockReturnValue(scores) };
    const interaction = {
      client: {
        users: {
          fetch: vi.fn((id) =>
            id === "gone"
              ? Promise.reject(new Error("Unknown User"))
              : Promise.resolve({ username: "alice_raw", displayName: "AliceGlobal" })
          ),
        },
      },
      guild: { members: { fetch: vi.fn(() => Promise.reject(new Error("Unknown Member"))) } },
      deferReply: vi.fn(),
      editReply: vi.fn(),
    };

    await command.execute(interaction, { db });

    const message = interaction.editReply.mock.calls[0][0];
    expect(message).toContain("**AliceGlobal** - Score: **10**");
    expect(message).toContain("**someone** - Score: **4**");
  });
});
