# AutoWeenus Discord Bot

This is a discord bot with an attitude, used in private discord servers to add functionality where it is needed. Here are some of the features...

## Wordle Counter

When users post their wordle results to any channel, the bot will:
 - Save the user's score or add to its total score,
 - Let the user know it's total score (7 for a guess in 1, 1 for a guess in 6),
 - Give the user an average number of guesses per score,
 - Stop cheating by making sure the format of the message is correct, and making sure the user isn't reposting old days
 - Track the Wordle leaderboards by total score or average score

## ChatGPT Intergration

When the bot is mentioned directly using an @, it will give verbose replies using the ChatGPT api server. Don't rely on it to give you straight answers, it's a sarcastic bot.

## Transfer Pins

To get around Discord's 50 pin limit, slash (/) commands can be used to transfer the pins of one channel, to messages in another. For example, if you've got 50 memes pinned in a meme channel, the bot can move these to a new 'best-of-memes' channel and give you space to pin extra memes.

The bot will post the message, image or link along with the original poster and date to the new channel.

## AutoWeenus Phrase Detection

It is important for a bot to make sure users keep in line, when a user says the phrase 'autoweenus' the bot will let them know it's watching them with one of a series of canned responses.

## Other Features

The bot can do other slash commands, check out the code or give the bot a go to try!

# Set up

Rename the exampleconfig.json file to config.json, paste your ChatGPT api token and your discord bot key into this file.

Minimum node version 21.6
