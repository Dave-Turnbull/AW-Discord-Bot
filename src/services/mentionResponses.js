const NAMEDROP_REPLIES = [
  "You talking shit about me?",
  "Keep my name out of your damn mouth!",
  "Hey baby",
  "Put some respek on my name.",
  "You think you can afford me?",
  "https://tenor.com/view/wwe-vince-mc-mahon-entrance-entry-strut-gif-4685176",
  "You best watch your mouth.",
  "You're cruisin for a bruisin.",
];

function randomNamedropReply() {
  return NAMEDROP_REPLIES[Math.floor(Math.random() * NAMEDROP_REPLIES.length)];
}

module.exports = { NAMEDROP_REPLIES, randomNamedropReply };
