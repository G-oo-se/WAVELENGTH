const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

// The database lives in /data as a single file. SQLite needs nothing else
// installed or running — it's just a file on disk. This uses Node's own
// built-in SQLite support (bundled since Node 22.5+) instead of a native
// addon, so there is nothing here that ever needs a C++ compiler on your
// machine, on Windows or otherwise. Node may print a one-line
// "ExperimentalWarning: SQLite" notice on startup — that's expected and
// harmless, not an error.
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'wavelength.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    genre TEXT DEFAULT '',
    description TEXT DEFAULT '',
    audio_path TEXT NOT NULL,
    cover_path TEXT,
    duration REAL DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
