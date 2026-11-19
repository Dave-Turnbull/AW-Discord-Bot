const { generateReply, getProvider } = require("../../src/ai");
const noneProvider = require("../../src/ai/providers/none");
const openaiProvider = require("../../src/ai/providers/openai");

describe("getProvider", () => {
  it("resolves known provider names", () => {
    expect(getProvider("none")).toBe(noneProvider);
    expect(getProvider("openai")).toBe(openaiProvider);
  });

  it("throws for an unknown provider name", () => {
    expect(() => getProvider("bogus")).toThrow(/Unknown AI_PROVIDER/);
  });
});

describe("generateReply", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the 'none' provider's canned response when nothing is configured", async () => {
    const reply = await generateReply("hi", { aiProvider: "none" });
    expect(reply).toMatch(/No AI provider configured/);
  });

  it("returns a safe fallback line if the provider throws", async () => {
    vi.spyOn(openaiProvider, "generateReply").mockRejectedValue(new Error("boom"));
    const reply = await generateReply("hi", { aiProvider: "openai" });
    expect(reply).toBe("How about you go outside.");
  });
});
