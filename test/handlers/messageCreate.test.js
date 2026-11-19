const aiModule = require("../../src/ai");
const createMessageHandler = require("../../src/handlers/messageCreate");

const BOT_ID = "999000000000000001";

function makeMessage({ authorId = "user-1", content, mentionsBot = false, repliesToBot = false } = {}) {
  return {
    author: { id: authorId },
    client: { user: { id: BOT_ID } },
    content,
    mentions: {
      users: { has: (id) => mentionsBot && id === BOT_ID },
      repliedUser: repliesToBot ? { id: BOT_ID } : undefined,
    },
    reply: vi.fn(),
  };
}

function makeDb(overrides = {}) {
  return {
    getScore: vi.fn().mockReturnValue(null),
    recordGuess: vi.fn().mockReturnValue({ score: 4, guessTotal: 1, lastGuessDay: 1234 }),
    ...overrides,
  };
}

describe("messageCreate handler", () => {
  let generateReply;

  beforeEach(() => {
    generateReply = vi.spyOn(aiModule, "generateReply").mockResolvedValue("mocked ai reply");
  });

  afterEach(() => {
    generateReply.mockRestore();
  });

  it("ignores the bot's own messages", async () => {
    const db = makeDb();
    const handler = createMessageHandler({ db, config: {} });
    const message = makeMessage({ authorId: BOT_ID, content: "hi" });

    await handler(message);

    expect(message.reply).not.toHaveBeenCalled();
    expect(db.getScore).not.toHaveBeenCalled();
  });

  it("asks the AI provider for a reply when mentioned", async () => {
    const db = makeDb();
    const handler = createMessageHandler({ db, config: { aiProvider: "none" } });
    const message = makeMessage({ content: `<@${BOT_ID}> hello there`, mentionsBot: true });

    await handler(message);

    expect(generateReply).toHaveBeenCalledWith("hello there", { aiProvider: "none" });
    expect(message.reply).toHaveBeenCalledWith("mocked ai reply");
  });

  it("asks the AI provider for a reply when the message is a ping-reply to the bot", async () => {
    const db = makeDb();
    const handler = createMessageHandler({ db, config: {} });
    const message = makeMessage({ content: "you good?", repliesToBot: true });

    await handler(message);

    expect(generateReply).toHaveBeenCalled();
    expect(message.reply).toHaveBeenCalledWith("mocked ai reply");
  });

  it("gives a namedrop reply when 'autoweenus' is said without mentioning the bot", async () => {
    const db = makeDb();
    const handler = createMessageHandler({ db, config: {} });
    const message = makeMessage({ content: "autoweenus is watching" });

    await handler(message);

    expect(generateReply).not.toHaveBeenCalled();
    expect(message.reply).toHaveBeenCalledTimes(1);
    expect(typeof message.reply.mock.calls[0][0]).toBe("string");
  });

  it("ignores ordinary messages", async () => {
    const db = makeDb();
    const handler = createMessageHandler({ db, config: {} });
    const message = makeMessage({ content: "just chatting" });

    await handler(message);

    expect(message.reply).not.toHaveBeenCalled();
    expect(db.recordGuess).not.toHaveBeenCalled();
  });

  it("records a wordle win and replies with the updated score", async () => {
    const db = makeDb();
    const handler = createMessageHandler({ db, config: {} });
    const content = `Wordle 500 1/6\n\n🟩🟩🟩🟩🟩`;
    const message = makeMessage({ content });

    await handler(message);

    expect(db.recordGuess).toHaveBeenCalledWith("user-1", { scoreDelta: 6, day: 500 });
    expect(message.reply).toHaveBeenCalledWith(expect.stringContaining("Score: 4"));
  });

  it("rejects a same-day resubmission without touching the db", async () => {
    const db = makeDb({
      getScore: vi.fn().mockReturnValue({ userId: "user-1", score: 4, guessTotal: 1, lastGuessDay: 500 }),
    });
    const handler = createMessageHandler({ db, config: {} });
    const content = `Wordle 500 1/6\n\n🟩🟩🟩🟩🟩`;
    const message = makeMessage({ content });

    await handler(message);

    expect(db.recordGuess).not.toHaveBeenCalled();
    expect(message.reply).toHaveBeenCalledWith("You've already guessed today!");
  });
});
