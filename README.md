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
- **Genres** — a fixed 21-item list (see `lib/genres.js`), stored per-track
  as a many-to-many relationship (`track_genres`), so a track can carry
  several. Multi-select everywhere: a pill picker when adding a track, and
  a collapsed "Filter by genre" button (with a count badge) on Browse,
  Liked, a playlist, and a profile's tracks — pick any number to narrow
  the list to tracks that have **all** of them, not just any one (so
  selecting Jazz + Relax shows only tracks tagged with both, not tracks
  that merely have one or the other). On Browse this filters via the
  server (same query as search); elsewhere it filters client-side over
  the already-loaded list. A track showing more than 2 genres collapses
  the rest behind a small "+N" that opens a floating popover with the
  full list, so a heavily-tagged track never overflows its own card.
- **Search** — matches title, artist, *and* genre, and also surfaces
  matching public playlists.
- **Downloading** — uploaded tracks (not YouTube/SoundCloud ones — there's
  no file on the server for those) have a download button next to like/add.
- **Copy link** — YouTube/SoundCloud tracks have a copy-link button that
  copies the original URL to your clipboard.
- **Playlists** — create, rename, delete, add/remove tracks, give one a
  description and cover image, mark it public or private, and drag to
  reorder its tracks (owner only, list view, and only while no genre
  filter is active — see **How the pieces fit together**). Public
  playlists show up on their owner's profile and in search; private ones
  are visible only to you. "Play all" and "Shuffle play" both default to
  looping the playlist when it reaches the end (see **How the pieces fit
  together** for the shuffle-specific detail).
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
public/js/components.js    shared track-card rendering (like/add/download/copy/delete)
public/js/embedModal.js     the YouTube/SoundCloud embedded-player modal
public/js/playlistPicker.js "add to playlist" modal
public/js/genrePicker.js    multi-select genre pills, plain and collapsible
public/js/dragReorder.js    native HTML5 drag-and-drop for playlist tracks
public/js/theme.js          theme picker + localStorage persistence
public/js/viewToggle.js     grid/list toggle + localStorage persistence
public/js/state.js          shared in-memory state (current user, search)
public/js/utils.js          escapeHtml() for safely rendering user text
public/js/views/            one file per screen
```

## How the pieces fit together

- **Genres** are a fixed list in `lib/genres.js` (backend), served at
  `GET /api/genres` and fetched once by the frontend — one source of
  truth, so the upload picker and every filter bar can never drift out
  of sync with each other. A track's genres live in their own table
  (`track_genres`, one row per track-genre pair) rather than a column on
  `tracks`, since a track can now have several. The old single-genre
  `tracks.genre` column is still on disk for anyone upgrading from an
  earlier version, but nothing reads or writes it anymore — see the
  migration in `db/database.js`, which carries forward any old single
  genre value that's still in the predefined list, once, the first time
  it finds `track_genres` doesn't exist yet.
- **Storage paths** are resolved once, in `config.js`, and imported
  everywhere else — nothing else computes an uploads/data path itself.
- **Admin** is a separate `is_admin` flag, set only via the CLI script.
  `DELETE /api/tracks/:id` checks server-side that the requester is the
  track's owner or an admin — the delete button in the UI is a
  convenience, not the security boundary.
- **A playlist's visibility** is enforced server-side in
  `GET /api/playlists/:id`: a private playlist 404s for anyone but its
  owner, so there's no way to reach one by guessing or sharing its URL.
- **Reordering a playlist** is scoped to owner + list view + no active
  genre filter. That's a deliberate choice, not a limitation I forgot to
  lift: reordering a *filtered* view would mean deciding where a dragged
  track lands relative to tracks you can't currently see, which has no
  unambiguous answer. `PATCH /api/playlists/:id/reorder` also independently
  verifies the submitted track list is exactly a reordering of the
  playlist's actual tracks — no additions, no omissions — before writing
  anything.
- **A playlist loops by default.** "Play all" / "Shuffle play" call
  `setRepeatMode('all')` on start — the repeat button in the player bar can
  still turn it off manually, same as always. In shuffle mode specifically,
  the queue reshuffles every time it loops back to the start, and that
  reshuffle is checked so the track that just finished can never land
  first in the new order — otherwise a small playlist has a real chance of
  playing the same track twice in a row right at the loop boundary.
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
- **Reordering while filtered** — currently disabled specifically to avoid
  ambiguity about where a moved track lands relative to hidden ones; a
  "reorder within this filtered view" mode is possible if you want it.
- **Production hardening**: rate-limit login/register/friend-request, and
  consider object storage (S3-compatible) instead of local disk if you
  expect real upload volume.

## A note on the startup warning

`ExperimentalWarning: SQLite is an experimental feature...` on `npm start`
is Node flagging that `node:sqlite` is a newer built-in API. Not an error —
everything here works fine with it.
