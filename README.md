# AutoWeenus Discord Bot

A Discord bot with an attitude, used in private Discord servers to add
functionality where it is needed.

## Features

### Wordle Counter

When users post their Wordle results to any channel, the bot will:
- Save the user's score (7 points for a guess in 1, 1 point for a guess in 6) or add to their total,
- Reply with total score and average guesses,
- Reject reposted/out-of-order days and grids that don't match their own header (basic cheat detection).

### AI mention replies

Mention the bot (or reply to one of its messages) and it replies via a
configurable AI provider - sarcastic, short. Provider is chosen with
`AI_PROVIDER`:

- `openai` - requires `OPENAI_API_KEY`, model via `OPENAI_MODEL` (default `gpt-4o-mini`)
- `anthropic` - requires `ANTHROPIC_API_KEY`, model via `ANTHROPIC_MODEL` (default `claude-haiku-4-5-20251001`)
- `none` (default) - replies with a canned line, no API calls

Adding another provider means adding a new module under `src/ai/providers/`
that exports `generateReply(userMessage, config)` and registering it in
`src/ai/index.js`.

### Transfer Pins

Discord caps pins per channel at 50. `/transferpins` copies pinned messages
(with attachments, author, and timestamp) from one channel to another,
optionally unpinning the originals.

### AutoWeenus Phrase Detection

Saying "autoweenus" without directly mentioning the bot gets a canned
sarcastic reply.

### Other commands

`/ping`, `/avatar`, `/wordle_score`, `/wordle_leaderboard`.

## Architecture

```
src/
  index.js              client setup, login, idempotent slash-command registration
  config.js             env var loading/validation
  db/                    sqlite (better-sqlite3) connection, migrations, wordle score repository
  ai/                    provider-agnostic AI layer (openai / anthropic / none)
  commands/               one file per slash command: { data, execute(interaction, ctx) }
  services/               pure, unit-tested logic (wordle parsing/scoring, mention replies)
  handlers/               interactionCreate + messageCreate wiring
test/                     vitest suite mirroring src/, one spec per module
```

State lives in a SQLite database (`DB_PATH`, default `./data/bot.sqlite3`),
not flat JSON files - the `wordle_scores` table today, with room to add more
without a redesign.

## Local development

```
npm install
DISCORD_TOKEN=... npm start   # secrets passed as real env vars, never added to .env
npm test
```

Copy `.env.example` to `.env` (gitignored, loaded automatically) and edit it
to change `AI_PROVIDER`/model defaults for local testing.

Minimum Node version: 22.

## Configuration

| Variable | Required | Notes |
|---|---|---|
| `DISCORD_TOKEN` | yes | bot token |
| `AI_PROVIDER` | no (default `none`) | `openai`, `anthropic`, or `none` |
| `OPENAI_API_KEY` | if `AI_PROVIDER=openai` | |
| `OPENAI_MODEL` | no | default `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | if `AI_PROVIDER=anthropic` | |
| `ANTHROPIC_MODEL` | no | default `claude-haiku-4-5-20251001` |
| `DB_PATH` | no | default `./data/bot.sqlite3` |

## Deployment

Not a web service - no reverse proxy routes, no published ports. Runs as a
single container that only makes outbound connections to Discord and
(optionally) an AI provider.

- `compose.prod.yaml` is the production stack file; `compose.yaml` is for
  local runs. Both build the image from `Dockerfile` (`build: .`), so the
  deploy tooling must rebuild the image on redeploy or merged code won't
  actually ship.
- Secrets (`DISCORD_TOKEN`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) are
  injected as environment variables at deploy, never committed.
- The SQLite database lives in the `score_data` volume mounted at
  `/app/data` - survives redeploys, isn't tracked in git.
- On first start, if a legacy `scoreData.json` exists next to the database,
  its scores are imported into SQLite once and the file is renamed to
  `scoreData.json.imported`.
