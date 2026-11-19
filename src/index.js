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

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  const commandData = [...commands.values()].map((command) => command.data.toJSON());
  for (const guild of client.guilds.cache.values()) {
    await guild.commands.set(commandData);
  }
});

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
