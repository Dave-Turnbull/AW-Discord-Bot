require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { loadConfig } = require("./config");
const { loadCommands } = require("./commands");
const { openDb } = require("./db");
const { importLegacyScores } = require("./db/legacyImport");
const { createWordleScoreRepository } = require("./db/wordleScoreRepository");
const createInteractionHandler = require("./handlers/interactionCreate");
const createMessageHandler = require("./handlers/messageCreate");

const path = require("path");

const config = loadConfig();
const rawDb = openDb(config.dbPath);
if (config.dbPath !== ":memory:") {
  importLegacyScores(rawDb, path.join(path.dirname(config.dbPath), "scoreData.json"));
}
const db = createWordleScoreRepository(rawDb);
const commands = loadCommands();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commandData = [...commands.values()].map((command) => command.data.toJSON());

async function registerCommands(guild) {
  try {
    await guild.commands.set(commandData);
  } catch (error) {
    console.error(`Failed to register commands in guild ${guild.id}:`, error);
  }
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  for (const guild of client.guilds.cache.values()) {
    await registerCommands(guild);
  }
});

// Servers joined while running get their commands immediately - without this
// a restart was needed before slash commands appeared on a new server.
client.on("guildCreate", registerCommands);

client.on("interactionCreate", createInteractionHandler(commands, { db }));
client.on("messageCreate", createMessageHandler({ db, config }));

function shutdown() {
  console.log("Shutting down...");
  client.destroy();
  rawDb.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

client.login(config.discordToken);
