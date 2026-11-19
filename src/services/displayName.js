/**
 * Plain-text display name for a user - never a mention/tag.
 * Prefers the per-server nickname (GuildMember), then the account's global
 * display name, then falls back to the raw username.
 */
function displayNameFor(member, user) {
  return member?.displayName ?? user?.displayName ?? user?.username ?? "someone";
}

module.exports = { displayNameFor };
