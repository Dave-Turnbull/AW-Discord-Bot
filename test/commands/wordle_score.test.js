const command = require("../../src/commands/wordle_score");

describe("/wordle_score", () => {
  it("tells the user they haven't played yet when there's no score", async () => {
    const interaction = { user: { id: "u1" }, reply: vi.fn() };
    const db = { getScore: vi.fn().mockReturnValue(null) };

    await command.execute(interaction, { db });

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringMatching(/have not played/) })
    );
  });

  it("reports score, total, and average when a score exists", async () => {
    const interaction = { user: { id: "u1" }, reply: vi.fn() };
    const db = {
      getScore: vi.fn().mockReturnValue({ userId: "u1", score: 10, guessTotal: 2, lastGuessDay: 5 }),
    };

    await command.execute(interaction, { db });

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Your Score: **10** - Total Wordles:** 2** - Average Guesses:** 2**",
      ephemeral: true,
    });
  });
});
