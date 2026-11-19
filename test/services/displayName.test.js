const { displayNameFor } = require("../../src/services/displayName");

describe("displayNameFor", () => {
  it("prefers the guild member's nickname", () => {
    const member = { displayName: "nicknamed" };
    const user = { displayName: "GlobalName", username: "raw_username" };
    expect(displayNameFor(member, user)).toBe("nicknamed");
  });

  it("falls back to the user's global display name when there is no member", () => {
    const user = { displayName: "GlobalName", username: "raw_username" };
    expect(displayNameFor(null, user)).toBe("GlobalName");
  });

  it("falls back to username when there is no global display name", () => {
    const user = { username: "raw_username" };
    expect(displayNameFor(null, user)).toBe("raw_username");
  });

  it("falls back to a generic label when nothing is available", () => {
    expect(displayNameFor(null, null)).toBe("someone");
  });
});
