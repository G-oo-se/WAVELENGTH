# Wavelength

A full-stack site for uploading, discovering, and playing music — built as a
starting point inspired by uwupad, but for full tracks instead of short
clips. Accounts, uploads or linked YouTube/SoundCloud tracks, public and
private playlists, likes, friends, themes, and a persistent audio player
with shuffle/repeat and a live waveform visualizer are all working out of
the box.

"Wavelength" is just a working title — rename it freely (see **Renaming**
below).

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite via Node's built-in `node:sqlite` module — a single
  file, nothing to install, nothing that ever needs compiling. Requires
  Node 22.5+.
- **Auth:** sessions (`express-session`) + hashed passwords (`bcryptjs`)
- **Uploads:** `multer`, storing audio/cover/avatar/playlist-cover files on
  disk
- **Frontend:** plain HTML/CSS/JS — no framework, no build step. A
  single-page app with a small hand-rolled hash router, so music keeps
  playing while you navigate.

## Getting started

1. Install [Node.js](https://nodejs.org) 22.5+ if you don't have it.
2. Open this folder in VS Code.
3. In the terminal:
   ```
   npm install
   npm start
   ```
4. Open **http://localhost:3000**.

`npm run dev` restarts the server automatically on save.

### Where data is stored

By default, the database lives at `./data/wavelength.db` and uploaded files
at `./uploads/`, both relative to the project. For hosting somewhere with a
persistent volume, set two environment variables to point at wherever that
volume is mounted instead:

```
DATA_DIR=/path/to/volume/data
UPLOADS_DIR=/path/to/volume/uploads
```

Both default to the local folders if unset, so nothing changes for local
development. This exists specifically so it doesn't matter where your host
puts the app's own code — you point the app and the volume at the same
place, deliberately, rather than guessing.

### Deploying

A `Dockerfile` and `.dockerignore` are included and work on any host that
builds from a Dockerfile (Northflank, Railway, Render, Fly.io, etc.). Three
things matter for a working deploy:
1. A port — the Dockerfile exposes **3000**.
2. `SESSION_SECRET` — set it to a random value (generate one with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
   Don't reuse the placeholder in `server.js`.
3. **A persistent volume**, mounted wherever you set `DATA_DIR`/`UPLOADS_DIR`
   above — without this, your data resets on every restart, which defeats
   the point of hosting it at all.

### Making yourself an admin

```
node scripts/make-admin.js your-username
```

Admins can delete *any* track, not just their own. The badge shows next to
your name in the nav once you log back in.

## Feature tour

- **Accounts** — register/login, edit your bio and profile picture.
- **Adding tracks** — either upload an audio file, or paste a YouTube or
  SoundCloud link instead. A linked track plays through that platform's own
  embedded player rather than a file living on your server — see
  **About linked tracks** below for why, and what that trades off.
- **Search** — matches title, artist, *and* genre, and also surfaces
  matching public playlists.
- **Playlists** — create, rename, delete, add/remove tracks, give one a
  description and cover image, and mark it public or private. Public
  playlists show up on their owner's profile and in search; private ones
  are visible only to you.
- **Likes** — heart any track; `#/liked` collects everything you've liked.
- **Friends** — mutual request/accept (not a one-way follow), with pending
  requests shown both directions.
- **Player** — shuffle, repeat-all, repeat-one, next/prev, queue = whatever
  list you clicked play from.
- **Themes** — 4 selectable themes (2 dark, 2 light) via the swatches in
  the top bar, persisted per browser.
- **Grid/list view toggle**, remembered per browser.
- **Mobile adaptive** layout.

## About linked tracks

Pasting a YouTube or SoundCloud link never downloads or stores audio on
Wavelength — it only builds a URL for that platform's own embedded player,
the same as embedding a video on any other site. Rehosting someone else's
music file is a different, much riskier thing to build (it's the pattern
that's gotten similar sites shut down), so linked tracks are intentionally
"play via their player," not "download and host our own copy."

Practical effects of that:
- A linked track's cover art is auto-filled where possible (YouTube always;
  SoundCloud only if its oEmbed API responds — this is best-effort and
  quietly skipped on failure, so it never blocks adding the track).
- Duration isn't available for linked tracks without a paid API key, so it's
  just not shown.
- Clicking play on a linked track opens a small modal with that platform's
  player, rather than joining Wavelength's own player/queue. Shuffle,
  repeat, and next/prev only operate over uploaded tracks in whatever list
  you're browsing — a "play all" on a mixed playlist skips linked tracks
  rather than trying (and failing) to pipe an external iframe through them.

## Project structure

```
server.js                Express app setup, sessions, static file serving
config.js                 Resolves DATA_DIR/UPLOADS_DIR (env-configurable)
Dockerfile / .dockerignore
scripts/make-admin.js    CLI: node scripts/make-admin.js <username>
db/database.js           SQLite connection + table definitions + migrations
lib/externalTrack.js      YouTube/SoundCloud URL -> embed info (no network
                           call required for the core feature to work)
middleware/auth.js        requireAuth guard for protected routes
middleware/upload.js      multer configs: tracks, avatars, playlist covers
routes/auth.js             register, login, logout, /me
routes/tracks.js           list/search, add (upload or link), likes, delete
routes/users.js             public profile, avatar/bio edit, friends
routes/playlists.js         create/edit/delete, cover, search, add/remove tracks
public/index.html          the single HTML page (the SPA shell)
public/css/style.css       all styles, including the 4 theme variable sets
public/js/app.js           wires up routes, nav, search, theme picker
public/js/router.js        tiny hash-based client-side router
public/js/api.js           fetch() wrapper for the backend API
public/js/player.js        queue-based player: shuffle, repeat, visualizer
public/js/components.js    shared track-card rendering
public/js/embedModal.js     the YouTube/SoundCloud embedded-player modal
public/js/playlistPicker.js "add to playlist" modal
public/js/theme.js          theme picker + localStorage persistence
public/js/viewToggle.js     grid/list toggle + localStorage persistence
public/js/state.js          shared in-memory state (current user, search)
public/js/utils.js          escapeHtml() for safely rendering user text
public/js/views/            one file per screen
```

## How the pieces fit together

- **Storage paths** are resolved once, in `config.js`, and imported
  everywhere else — nothing else computes an uploads/data path itself.
- **Admin** is a separate `is_admin` flag, set only via the CLI script.
  `DELETE /api/tracks/:id` checks server-side that the requester is the
  track's owner or an admin — the delete button in the UI is a
  convenience, not the security boundary.
- **A playlist's visibility** is enforced server-side in
  `GET /api/playlists/:id`: a private playlist 404s for anyone but its
  owner, so there's no way to reach one by guessing or sharing its URL.
- **File cleanup on delete** only unlinks paths that start with
  `/uploads/` — a linked track's cover can be an external URL (like
  YouTube's thumbnail CDN), and that must never be treated as a local file
  to delete.
- **The player queue** is just whatever array of tracks a card was
  rendered from, so next/prev naturally move through search results, a
  profile, or a playlist. Linked tracks never enter that queue — their
  play button always opens the embed modal instead.
- **Themes** are CSS custom properties swapped via a `data-theme`
  attribute on `<html>`, applied before first paint by a small inline
  script in `<head>` so there's no flash of the wrong theme.
- **User-submitted text is HTML-escaped** (`public/js/utils.js`) before
  being inserted into the page, and usernames are restricted to
  letters/numbers/`_`/`-`.

## Renaming

"Wavelength" appears in `package.json`, `public/index.html` (`<title>` and
the `.wordmark` text), and this README.

## Ideas for what's next

- **Comments** on tracks.
- **A leaderboard page** off the existing `play_count` data.
- **Genre browsing** as clickable tags instead of free text.
- **Drag-to-reorder** playlist tracks — the `position` column already
  supports it, just not editable from the UI yet.
- **Production hardening**: rate-limit login/register/friend-request, and
  consider object storage (S3-compatible) instead of local disk if you
  expect real upload volume.

## A note on the startup warning

`ExperimentalWarning: SQLite is an experimental feature...` on `npm start`
is Node flagging that `node:sqlite` is a newer built-in API. Not an error —
everything here works fine with it.
