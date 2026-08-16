const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { dataDir } = require('../config');

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
    avatar_path TEXT,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    genre TEXT DEFAULT '',
    description TEXT DEFAULT '',
    audio_path TEXT NOT NULL DEFAULT '',
    cover_path TEXT,
    duration REAL DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    source_type TEXT NOT NULL DEFAULT 'upload',
    external_url TEXT,
    embed_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS likes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, track_id)
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_path TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlist_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (playlist_id, track_id)
  );

  CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (requester_id, addressee_id)
  );
`);

// A track can now have several genres, so genres live in their own table
// rather than the old single tracks.genre column (still present on disk,
// but no longer written to — see the migration below).
const hadTrackGenres = !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'track_genres'").get();
if (!hadTrackGenres) {
  db.exec(`
    CREATE TABLE track_genres (
      track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      genre TEXT NOT NULL,
      PRIMARY KEY (track_id, genre)
    );
  `);

  // One-time migration: carry forward anyone's existing single genre value,
  // as long as it's still one of the predefined options.
  const { GENRES } = require('../lib/genres');
  const oldGenres = db.prepare("SELECT id, genre FROM tracks WHERE genre IS NOT NULL AND genre != ''").all();
  const insertGenre = db.prepare('INSERT OR IGNORE INTO track_genres (track_id, genre) VALUES (?, ?)');
  oldGenres.forEach(({ id, genre }) => {
    if (GENRES.includes(genre)) insertGenre.run(id, genre);
  });
}

// Lightweight migrations for anyone who already has a database file from an
// earlier version of this project.
function addColumnIfMissing(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((col) => col.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing('users', 'is_admin', 'INTEGER NOT NULL DEFAULT 0');
addColumnIfMissing('users', 'avatar_path', 'TEXT');
addColumnIfMissing('tracks', 'source_type', "TEXT NOT NULL DEFAULT 'upload'");
addColumnIfMissing('tracks', 'external_url', 'TEXT');
addColumnIfMissing('tracks', 'embed_url', 'TEXT');
addColumnIfMissing('playlists', 'description', "TEXT DEFAULT ''");
addColumnIfMissing('playlists', 'cover_path', 'TEXT');
addColumnIfMissing('playlists', 'is_public', 'INTEGER NOT NULL DEFAULT 0');

module.exports = db;
