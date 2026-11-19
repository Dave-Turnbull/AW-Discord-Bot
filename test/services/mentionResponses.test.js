const { NAMEDROP_REPLIES, randomNamedropReply } = require("../../src/services/mentionResponses");

describe("randomNamedropReply", () => {
  it("always returns one of the defined replies", () => {
    for (let i = 0; i < 50; i++) {
      expect(NAMEDROP_REPLIES).toContain(randomNamedropReply());
    }
  });
});
