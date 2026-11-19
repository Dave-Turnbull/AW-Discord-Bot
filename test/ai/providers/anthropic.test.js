const { generateReply } = require("../../../src/ai/providers/anthropic");

describe("anthropic provider", () => {
  it("sends the system prompt and user message, returns the text block", async () => {
    const create = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "  How about you go outside.  " }],
    });
    const fakeClient = { messages: { create } };

    const reply = await generateReply(
      "hello",
      { anthropicModel: "claude-haiku-4-5-20251001" },
      { client: fakeClient }
    );

    expect(reply).toBe("How about you go outside.");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001",
        messages: [{ role: "user", content: "hello" }],
      })
    );
  });

  it("falls back to a default line when there is no text block", async () => {
    const create = vi.fn().mockResolvedValue({ content: [{ type: "tool_use" }] });
    const fakeClient = { messages: { create } };

    const reply = await generateReply("hi", { anthropicModel: "x" }, { client: fakeClient });
    expect(reply).toBe("I'm done talking.");
  });
});
