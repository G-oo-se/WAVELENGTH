# Wavelength

A full-stack site for uploading, discovering, and playing full music tracks —
built as a starting point inspired by uwupad, but for songs instead of short
clips. Accounts, uploads, playlists, likes, friends, themes, and a persistent
audio player with shuffle/repeat and a live waveform visualizer are all
working out of the box.

"Wavelength" is just a working title — rename it freely (see **Renaming**
below).

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite via Node's built-in `node:sqlite` module (a single
  file, no separate DB server, and nothing that ever needs compiling on your
  machine, since it ships inside Node itself). Requires Node 22.5+; check
  yours with `node --version`.
- **Auth:** sessions (`express-session`) + hashed passwords (`bcryptjs`)
- **Uploads:** `multer`, storing audio/cover/avatar files on disk under
  `/uploads`
- **Frontend:** plain HTML/CSS/JS — no framework, no build step. It's a
  single-page app with a small hand-rolled hash router, so the page never
  fully reloads and music keeps playing while you navigate.

Everything is plain JavaScript on purpose, since that's what you already
know — there's no new language to learn to work on the backend.

## Getting started

1. Install [Node.js](https://nodejs.org) 22.5 or later if you don't have it.
2. Open this folder in VS Code.
3. In the VS Code terminal (`` Ctrl+` `` / `` Cmd+` ``):
   ```
   npm install
   npm start
   ```
4. Open **http://localhost:3000** in your browser.

The first run creates `data/wavelength.db` (the database) and an `uploads/`
folder automatically — both are already git-ignored.

Use `npm run dev` instead of `npm start` while actively working on the
backend — it restarts the server automatically whenever you save a file.

### Making yourself an admin

Registering an account gives you a normal account — admin is a separate flag
nothing sets automatically. Register first through the site, then run:

```
node scripts/make-admin.js your-username
```

Admins can delete *any* track, not just their own (useful for moderation).
The badge shows next to your name in the nav once you log back in.

## Feature tour

- **Accounts** — register/login, edit your bio and profile picture
  (`#/edit-profile`).
- **Uploading** — title, artist, genre, description, audio file, optional
  cover art.
- **Browsing** — search, sort by newest/most-played, and a grid/list view
  toggle (remembered per browser).
- **Likes** — heart any track; see everything you've liked at `#/liked`.
- **Playlists** — create, rename, delete, add/remove tracks, and play a
  whole playlist in order or shuffled (`#/playlists`). Anyone can view a
  playlist; only its owner can edit it.
- **Friends** — send/accept/decline requests, unfriend, see pending
  requests both ways (`#/friends`). This is mutual (like Facebook), not a
  one-way follow.
- **Player** — shuffle, repeat-all, repeat-one, next/prev, and a queue
  that's just "whatever list you clicked play from" (search results, a
  profile, a playlist) — so next/prev naturally move through it.
- **Themes** — 4 selectable themes (2 dark, 2 light) via the swatches in
  the top bar; persisted per browser, applied before the page paints so
  there's no flash of the wrong theme on load.
- **Mobile** — the layout reflows at narrow widths (stacked nav, single
  transport row, hidden waveform/volume to save space).

## Project structure

```
server.js                Express app setup, sessions, static file serving
scripts/make-admin.js    CLI: node scripts/make-admin.js <username>
db/database.js           SQLite connection + table definitions + migrations
middleware/auth.js        requireAuth guard for protected routes
middleware/upload.js      multer config: track audio/cover + avatar uploads
routes/auth.js             register, login, logout, /me
routes/tracks.js           list/search, upload, play-count, likes, delete
routes/users.js             public profile, avatar/bio edit, friends
routes/playlists.js         create/rename/delete, add/remove tracks
public/index.html          the single HTML page (the SPA shell)
public/css/style.css       all styles, including the 4 theme variable sets
public/js/app.js           wires up routes, nav, search, theme picker
public/js/router.js        tiny hash-based client-side router
public/js/api.js           fetch() wrapper for the backend API
public/js/player.js        queue-based player: shuffle, repeat, visualizer
public/js/components.js    shared track-card rendering (like/add/delete)
public/js/playlistPicker.js "add to playlist" modal
public/js/theme.js          theme picker + localStorage persistence
public/js/viewToggle.js     grid/list toggle + localStorage persistence
public/js/state.js          shared in-memory state (current user, search)
public/js/utils.js          escapeHtml() for safely rendering user text
public/js/views/            one file per screen
```

## How the pieces fit together

- **Auth** is session-based: logging in sets a cookie, `requireAuth` checks
  `req.session.userId` on routes that need it.
- **Admin** is a separate `is_admin` flag on the user, set only via the CLI
  script — there's no in-app way to grant it, so it can't be self-served
  through a UI bug. `DELETE /api/tracks/:id` checks server-side that the
  requester is either the track's owner or an admin; the delete button in
  the UI is just a convenience, not the actual security boundary.
- **Uploads** (audio, cover art, avatars) each get a random filename so two
  people uploading `photo.jpg` don't collide, and get deleted from disk when
  the track/playlist-entry/avatar they belong to is deleted or replaced.
- **Friendships** are one row per pair with a `status` of `pending` or
  `accepted`; who sent it is `requester_id`. A profile's `friend_status` is
  computed relative to whoever's logged in viewing it.
- **Playlist tracks** have a `position` column for ordering, and a `UNIQUE`
  constraint on `(playlist_id, track_id)` so the same track can't be added
  twice — the add-track route relies on that constraint rather than
  checking manually.
- **The player queue** is just whatever array of tracks a card was rendered
  from (`createTrackCard(track, contextTracks, index)`), so next/prev
  naturally move through search results, a profile's tracks, or a
  playlist — no separate "queue" concept to manage.
- **Themes** are CSS custom properties swapped via a `data-theme` attribute
  on `<html>`; a small inline script in `<head>` applies the saved theme
  before first paint so there's no flash of the default theme. Grid/list
  view uses the same localStorage pattern.
- **Seeking in the player works** because Express's static file serving
  handles HTTP Range requests automatically.
- **The waveform is real**, not decorative — it reads live frequency data
  from the actual playing audio via the Web Audio API.
- **User-submitted text is HTML-escaped** (`public/js/utils.js`) before
  being inserted into the page, and usernames are restricted to
  letters/numbers/`_`/`-`, so one person's upload or bio can't run script
  in another person's browser.

## Renaming

The name "Wavelength" appears in `package.json` (`name`), `public/index.html`
(`<title>` and the `.wordmark` text), and this README. Search-and-replace
those and you're set.

## Ideas for what's next

- **Comments** on tracks.
- **A leaderboard page** — `play_count` is already tracked; a `/leaderboard`
  view sorted by it is most of the way there.
- **Genre browsing** as clickable tags instead of free text.
- **Drag-to-reorder** playlist tracks — the `position` column is already
  there, just not yet editable from the UI.
- **A real-time "now playing" indicator** on profiles.
- **Production hardening** if you ever deploy this publicly: move the
  session secret into an environment variable (there's a comment marking
  where in `server.js`), add rate-limiting on login/register/friend-request,
  and consider object storage (like S3) instead of local disk for uploads.

## A note on the startup warning

When you run `npm start`, you'll see one line like `ExperimentalWarning:
SQLite is an experimental feature and might change at any time`. That's
Node flagging that `node:sqlite` is a newer built-in API — it's not an
error, and everything in this app works fine with it.
