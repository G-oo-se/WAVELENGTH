# Wavelength

A full-stack site for uploading, discovering, and playing full music tracks —
built as a starting point inspired by uwupad, but for songs instead of short
clips. Accounts, real file uploads, a real database, and a persistent audio
player with a live waveform visualizer are all working out of the box.

"Wavelength" is just a working title — rename it freely (see **Renaming**
below).

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite via Node's built-in `node:sqlite` module (a single
  file, no separate DB server, and — unlike some SQLite libraries — nothing
  that ever needs compiling on your machine, since it ships inside Node
  itself). Requires Node 22.5+; you can check yours with `node --version`.
- **Auth:** sessions (`express-session`) + hashed passwords (`bcryptjs`)
- **Uploads:** `multer`, storing files on disk under `/uploads`
- **Frontend:** plain HTML/CSS/JS — no framework, no build step. It's a
  single-page app with a small hand-rolled hash router (`#/`, `#/login`,
  `#/profile/alex`, etc.), so the page never fully reloads and music keeps
  playing while you navigate.

Everything is plain JavaScript on purpose, since that's what you already
know — there's no new language to learn to work on the backend.

## Getting started

1. Install [Node.js](https://nodejs.org) 18 or later if you don't have it.
2. Open this folder in VS Code.
3. In the VS Code terminal (`` Ctrl+` `` / `` Cmd+` ``):
   ```
   npm install
   npm start
   ```
4. Open **http://localhost:3000** in your browser.

The first run creates `data/wavelength.db` (the database) and an `uploads/`
folder automatically — both are already git-ignored.

Use `npm run dev` instead of `npm start` while you're actively working on
the backend — it restarts the server automatically whenever you save a file.

## Project structure

```
server.js              Express app setup, sessions, static file serving
db/database.js         SQLite connection + table definitions
middleware/auth.js      requireAuth guard for protected routes
middleware/upload.js    multer config for audio/cover uploads
routes/auth.js          register, login, logout, /me
routes/tracks.js        list/search, get one, upload, play-count
routes/users.js         public profile + a user's tracks
public/index.html       the single HTML page (the SPA shell)
public/css/style.css    all styles
public/js/app.js        wires up routes, nav, and search
public/js/router.js     tiny hash-based client-side router
public/js/api.js        fetch() wrapper for the backend API
public/js/player.js     persistent audio player + Web Audio visualizer
public/js/components.js shared track-card rendering
public/js/views/        one file per screen (browse, login, upload, ...)
```

## How the pieces fit together

- **Auth** is session-based: logging in sets a cookie, `requireAuth`
  checks `req.session.userId` on routes that need it (like uploading).
- **Uploads** go through `multer`, get a random filename (so two people
  uploading `song.mp3` don't collide), and get saved under
  `/uploads/audio` or `/uploads/covers`. The database only stores the
  path, not the file itself.
- **Seeking in the player works** because Express's static file serving
  handles HTTP Range requests automatically — no custom streaming code
  needed.
- **The waveform in the player bar is real**, not decorative: it reads
  live frequency data from the actual playing audio via the Web Audio
  API and draws it to a canvas.
- **Track/artist/username text is HTML-escaped** (see `public/js/utils.js`)
  before being inserted into the page, and usernames are restricted to
  letters/numbers/`_`/`-`, so one person's upload can't run script in
  another person's browser.

## Renaming

The name "Wavelength" appears in three places: `package.json` (`name`),
`public/index.html` (`<title>` and the `.wordmark` link text), and this
README. Search-and-replace those and you're set — nothing else references it.

## Ideas for what's next

This covers the core loop — accounts, uploading, browsing, playing — but
leaves room to grow, borrowing straight from what makes uwupad useful:

- **Playlists** — a `playlists` table plus a join table linking playlists to
  tracks.
- **A real leaderboard page** — `play_count` is already tracked; a
  `/leaderboard` view sorted by it gets you most of the way there.
- **Likes/favorites** — a `likes` table (`user_id`, `track_id`) plus a
  button on each track card.
- **Comments** on tracks.
- **Genre browsing** as clickable tags instead of free text.
- **Production hardening** if you ever deploy this publicly: move the
  session secret into an environment variable (there's a comment marking
  where in `server.js`), add rate-limiting on login/register, and consider
  object storage (like S3) instead of local disk for uploaded files.

## A note on the startup warning

When you run `npm start`, you'll see one line like
`ExperimentalWarning: SQLite is an experimental feature and might change at
any time`. That's Node telling you `node:sqlite` is a newer built-in API —
it's not an error, and everything in this app works fine with it.
