const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "users.json");

function readDb() {
  if (!fs.existsSync(DB_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeDb(data) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getUser(discordId) {
  return readDb()[discordId] ?? null;
}

function getEpicUsername(discordId) {
  return getUser(discordId)?.epicUsername ?? null;
}

function setEpicUsername(discordId, epicUsername) {
  const db = readDb();
  db[discordId] = { ...db[discordId], epicUsername };
  writeDb(db);
}

function updateUser(discordId, patch) {
  const db = readDb();
  db[discordId] = { ...db[discordId], ...patch };
  writeDb(db);
  return db[discordId];
}

function deleteUser(discordId) {
  const db = readDb();
  const existed = Boolean(db[discordId]);
  delete db[discordId];
  writeDb(db);
  return existed;
}

module.exports = { getUser, getEpicUsername, setEpicUsername, updateUser, deleteUser };
