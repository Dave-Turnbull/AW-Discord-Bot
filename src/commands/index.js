const fs = require("fs");
const path = require("path");

function loadCommands(dir = __dirname) {
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".js") && file !== "index.js");

  const commands = new Map();
  for (const file of files) {
    const command = require(path.join(dir, file));
    if (!command || !command.data || typeof command.execute !== "function") {
      throw new Error(`Command file ${file} must export { data, execute }`);
    }
    commands.set(command.data.name, command);
  }
  return commands;
}

module.exports = { loadCommands };
