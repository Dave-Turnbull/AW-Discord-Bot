const { Client, GatewayIntentBits } = require("discord.js");
const { Configuration, OpenAIApi } = require("openai");
const config = require("./config.json");
const fs = require("fs");
const path = require("path");
//const responses = require("./responses/mentionresponse.js");

const configuration = new Configuration({
  apiKey: config.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Read the score data from the JSON file
let scoreData;

try {
  const scoreDataPath = path.join(__dirname, "scoreData.json");
  scoreData = JSON.parse(fs.readFileSync(scoreDataPath, "utf8"));
} catch (error) {
  console.log("No score data found, initializing new score data.");
  scoreData = {};
}

/*==============
  SLASH COMMANDS
  =============*/
// Load commands
const commands = [];
const commandFiles = fs
  .readdirSync(path.join(__dirname, "/commands"))
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  try {
    const command = require(`./commands/${file}`);
    if (typeof command === "function") {
      commands.push(command(scoreData, client));
    } else {
      console.log(`Error importing ${file}, please make sure it is a function`);
    }
  } catch (error) {
    console.error(`Error loading command ${file}:`, error);
  }
}

//register commands
client.once("ready", async () => {
  // Registering the slash commands for each guild the bot is in
  for (const guild of client.guilds.cache.values()) {
    for (const command of commands) {
      await guild.commands.create(command);
    }
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  // Find the command object that matches the commandName
  const command = commands.find((cmd) => cmd.name === commandName);

  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error executing this command!",
      ephemeral: true,
    });
  }
});

/*==============
  SPEECH REPLIES
  =============*/

// Define an array of possible replies
const namedropNoMention = [
  "You talking shit about me?",
  "Keep my name out of your damn mouth!",
  "Hey baby",
  "Put some respek on my name.",
  "You think you can afford me?",
  "https://tenor.com/view/wwe-vince-mc-mahon-entrance-entry-strut-gif-4685176",
  "You best watch your mouth.",
  "You're cruisin for a bruisin.",
];

async function sendMessage(message, content) {
  if (!message) {
    console.log("Empty message was attempted");
    return;
  }
  try {
    await message.reply(content);
  } catch (error) {
    console.error("Failed to send a message:", error);
  }
}

async function getAiResponse(contentNM, message) {
  try {
    const conversation = [
      {
        role: "system",
        content:
          "You're a discord bot called AutoWeenus, helpful but hostile & sarcastic, keep response below 8 words.",
      },
      { role: "user", content: contentNM },
    ];
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: conversation,
      max_tokens: 60,
      temperature: 0.1,
    });
    const response = completion.data.choices[0].message || "I'm done talking.";
    sendMessage(message, response);
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      const errorMessage = error.response.data.error.message;
      console.error("OpenAI API error:", errorMessage);
      sendMessage(message, "Go Away.");
    } else {
      console.error("OpenAI API call failed:", error);
      sendMessage(message, "How about you go outside.");
    }
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.id === client.user.id) {
    return;
  }
  const userId = message.author.id;
  const content = message.content;
  console.log(content);
  if (
    message.mentions.users.has(client.user.id) ||
    (message.reference && message.reference.messageID === client.user.id)
  ) {
    const contentNM = message.content
      .replace(/<@!?[0-9]+>/, "")
      .trim()
      .toLowerCase();

    getAiResponse(contentNM, message);
  } else if (message.content.toLowerCase().includes("autoweenus")) {
    const randomReply =
      namedropNoMention[Math.floor(Math.random() * namedropNoMention.length)];
    message.reply(randomReply);
  }
  //WORDLE SCORE COUNTER
  if (
    /^Wordle ([\d,]+) \d\/\d|^Wordle \d+ X/.test(content) &&
    /[🟥🟨🟩🟧🟦⬜🟫⬛]/.test(content)
  ) {
    const lines = content.split("\n");
    let guessCount = 1;

    // Iterate over the lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check if the line contains any of the specified emojis
      if (/[🟥🟨🟩🟧🟦⬜🟫⬛]/.test(line)) {
        guessCount++;

        // Check if the line contains five green or orange squares in a row
        if (/(🟩){5}|(🟧){5}/.test(line)) {
          guessCount -= 1;
          break;
        }
      }
    }
    const match = content.match(/\d+/g);
    let lastday;
    if (scoreData[userId]) {
      lastday = parseInt(scoreData[userId].lastGuessDay);
    }
    let currentday = parseInt(match[0]);
    if (lastday == currentday) {
      message.reply(`You've already guessed today!`);
    } else if (lastday > currentday) {
      message.reply(`You've already guessed a later day!`);
    } else if (guessCount == match[1]) {
      // Update the user's score
      const userId = message.author.id;
      if (!scoreData[userId]) {
        scoreData[userId] = { score: 0, lastGuessDay: 0, guessTotal: 0 };
      }
      scoreData[userId].score += 7 - guessCount;
      scoreData[userId].lastGuessDay = currentday;
      scoreData[userId].guessTotal++;

      // Save the score data to the JSON file
      fs.writeFileSync(
        path.join(__dirname, "scoreData.json"),
        JSON.stringify(scoreData, null, 2)
      );

      message.reply(
        `**Score: ${scoreData[userId].score}** - You've done ${
          scoreData[userId].guessTotal
        } Wordles with an average of ${Number(
          (
            (7 * scoreData[userId].guessTotal - scoreData[userId].score) /
            scoreData[userId].guessTotal
          ).toFixed(3)
        )} guesses.`
      );
    } else if (lines.some((line) => line.includes("X/6")) && guessCount <= 7) {
      // Update the user's score
      const userId = message.author.id;
      if (!scoreData[userId]) {
        scoreData[userId] = { score: 0, lastGuessDay: 0, guessTotal: 0 };
      }
      scoreData[userId].lastGuessDay = currentday;
      scoreData[userId].guessTotal++;

      // Save the score data to the JSON file
      fs.writeFileSync(
        path.join(__dirname, "scoreData.json"),
        JSON.stringify(scoreData, null, 2)
      );
      message.reply(
        `Where did you learn to Wordle dummy?!\n**Score: ${
          scoreData[userId].score
        }** - You've done ${
          scoreData[userId].guessTotal
        } Wordles with an average of ${Number(
          (
            (7 * scoreData[userId].guessTotal - scoreData[userId].score) /
            scoreData[userId].guessTotal
          ).toFixed(3)
        )} guesses.`
      );
    } else {
      message.reply(`Are you trying to cheat?`);
    }
    //END OF WORDLE COUNTER
  }
});

client.login(config.token);
