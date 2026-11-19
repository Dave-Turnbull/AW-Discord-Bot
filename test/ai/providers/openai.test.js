const { generateReply } = require("../../../src/ai/providers/openai");

describe("openai provider", () => {
  it("sends the system prompt and user message, returns the reply text", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "  Go away.  " } }],
    });
    const fakeClient = { chat: { completions: { create } } };

    const reply = await generateReply(
      "hello",
      { openaiModel: "gpt-4o-mini" },
      { client: fakeClient }
    );

    expect(reply).toBe("Go away.");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o-mini",
        messages: [
          expect.objectContaining({ role: "system" }),
          { role: "user", content: "hello" },
        ],
      })
    );
  });

  it("falls back to a default line when the response has no content", async () => {
    const create = vi.fn().mockResolvedValue({ choices: [{ message: {} }] });
    const fakeClient = { chat: { completions: { create } } };

    const reply = await generateReply("hi", { openaiModel: "x" }, { client: fakeClient });
    expect(reply).toBe("I'm done talking.");
  });
});
