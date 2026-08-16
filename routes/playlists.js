const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { playlistCoverUpload } = require('../middleware/upload');
const { attachGenres, GENRES_SUBQUERY } = require('../lib/genres');

const router = express.Router();

function ownsPlaylist(playlistId, userId) {
  const row = db.prepare('SELECT user_id FROM playlists WHERE id = ?').get(playlistId);
  return !!row && row.user_id === userId;
}

// GET /api/playlists — the current user's own playlists (public + private), with track counts
router.get('/', requireAuth, (req, res) => {
  const playlists = db
    .prepare(
      `SELECT playlists.*, COUNT(playlist_tracks.id) AS track_count
       FROM playlists
       LEFT JOIN playlist_tracks ON playlist_tracks.playlist_id = playlists.id
       WHERE playlists.user_id = ?
       GROUP BY playlists.id
       ORDER BY playlists.created_at DESC`
    )
    .all(req.session.userId);
  res.json(playlists);
});

// GET /api/playlists/search?q= — public playlists only, matched by name.
// Registered before /:id so "search" is never treated as a playlist id.
router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  const playlists = db
    .prepare(
      `SELECT playlists.*, users.username AS owner_username, COUNT(playlist_tracks.id) AS track_count
       FROM playlists
       JOIN users ON users.id = playlists.user_id
       LEFT JOIN playlist_tracks ON playlist_tracks.playlist_id = playlists.id
       WHERE playlists.is_public = 1 AND (playlists.name LIKE ? OR playlists.description LIKE ?)
       GROUP BY playlists.id
       ORDER BY playlists.created_at DESC
       LIMIT 20`
    )
    .all(`%${q}%`, `%${q}%`);
  res.json(playlists);
});

router.post('/', requireAuth, (req, res) => {
  const { name, is_public } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Give the playlist a name.' });
  if (name.length > 60) return res.status(400).json({ error: 'Playlist names must be 60 characters or fewer.' });

  const info = db
    .prepare('INSERT INTO playlists (user_id, name, is_public) VALUES (?, ?, ?)')
    .run(req.session.userId, name.trim(), is_public ? 1 : 0);
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ ...playlist, track_count: 0 });
});

router.get('/:id', (req, res) => {
  const playlist = db
    .prepare(
      `SELECT playlists.*, users.username AS owner_username
       FROM playlists JOIN users ON users.id = playlists.user_id
       WHERE playlists.id = ?`
    )
    .get(req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found.' });

  const viewerId = req.session.userId;
  const isOwner = viewerId === playlist.user_id;
  if (!playlist.is_public && !isOwner) {
    return res.status(404).json({ error: 'Playlist not found.' });
  }

  const tracks = db
    .prepare(
      `SELECT tracks.*, users.username AS artist_username, users.avatar_path AS artist_avatar,
              (SELECT COUNT(*) FROM likes WHERE likes.track_id = tracks.id) AS like_count,
              ${GENRES_SUBQUERY}
       FROM playlist_tracks
       JOIN tracks ON tracks.id = playlist_tracks.track_id
       JOIN users ON users.id = tracks.user_id
       WHERE playlist_tracks.playlist_id = ?
       ORDER BY playlist_tracks.position ASC, playlist_tracks.added_at ASC`
    )
    .all(req.params.id);

  res.json({
    ...playlist,
    is_owner: isOwner,
    tracks: tracks.map((t) => {
      const withGenres = attachGenres(t);
      return {
        ...withGenres,
        liked_by_me: viewerId ? !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND track_id = ?').get(viewerId, t.id) : false
      };
    })
  });
});

router.patch('/:id', requireAuth, (req, res) => {
  if (!ownsPlaylist(req.params.id, req.session.userId)) {
    return res.status(403).json({ error: 'Only the playlist owner can edit it.' });
  }
  const { name, description, is_public } = req.body;

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Give the playlist a name.' });
    if (name.length > 60) return res.status(400).json({ error: 'Playlist names must be 60 characters or fewer.' });
    db.prepare('UPDATE playlists SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  }
  if (description !== undefined) {
    if (description.length > 500) return res.status(400).json({ error: 'Description must be 500 characters or fewer.' });
    db.prepare('UPDATE playlists SET description = ? WHERE id = ?').run(description, req.params.id);
  }
  if (is_public !== undefined) {
    db.prepare('UPDATE playlists SET is_public = ? WHERE id = ?').run(is_public ? 1 : 0, req.params.id);
  }

  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  res.json(playlist);
});

router.post('/:id/cover', requireAuth, playlistCoverUpload.single('cover'), (req, res) => {
  if (!ownsPlaylist(req.params.id, req.session.userId)) {
    return res.status(403).json({ error: 'Only the playlist owner can change its cover.' });
  }
  if (!req.file) return res.status(400).json({ error: 'No image was uploaded.' });

  const coverPath = `/uploads/playlist-covers/${req.file.filename}`;
  db.prepare('UPDATE playlists SET cover_path = ? WHERE id = ?').run(coverPath, req.params.id);
  res.json({ cover_path: coverPath });
});

router.delete('/:id', requireAuth, (req, res) => {
  if (!ownsPlaylist(req.params.id, req.session.userId)) {
    return res.status(403).json({ error: 'Only the playlist owner can delete it.' });
  }
  db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.patch('/:id/reorder', requireAuth, (req, res) => {
  if (!ownsPlaylist(req.params.id, req.session.userId)) {
    return res.status(403).json({ error: 'Only the playlist owner can reorder it.' });
  }
  const { track_ids } = req.body;
  if (!Array.isArray(track_ids) || !track_ids.length) {
    return res.status(400).json({ error: 'track_ids must be a non-empty array.' });
  }

  const currentIds = db
    .prepare('SELECT track_id FROM playlist_tracks WHERE playlist_id = ?')
    .all(req.params.id)
    .map((r) => r.track_id);
  const submittedIds = track_ids.map(Number);
  const sortedCurrent = [...currentIds].sort((a, b) => a - b);
  const sortedSubmitted = [...submittedIds].sort((a, b) => a - b);
  if (JSON.stringify(sortedCurrent) !== JSON.stringify(sortedSubmitted)) {
    return res.status(400).json({ error: "The submitted order doesn't match this playlist's current tracks." });
  }

  const update = db.prepare('UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?');
  db.exec('BEGIN');
  try {
    submittedIds.forEach((trackId, index) => {
      update.run(index, req.params.id, trackId);
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  res.json({ ok: true });
});

router.post('/:id/tracks', requireAuth, (req, res) => {
  if (!ownsPlaylist(req.params.id, req.session.userId)) {
    return res.status(403).json({ error: 'Only the playlist owner can add tracks.' });
  }
  const { track_id } = req.body;
  const track = db.prepare('SELECT id FROM tracks WHERE id = ?').get(track_id);
  if (!track) return res.status(404).json({ error: 'Track not found.' });

  const { maxPos } = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS maxPos FROM playlist_tracks WHERE playlist_id = ?')
    .get(req.params.id);

  try {
    db.prepare('INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)').run(
      req.params.id,
      track_id,
      maxPos + 1
    );
  } catch (err) {
    return res.status(409).json({ error: 'That track is already in this playlist.' });
  }
  res.status(201).json({ ok: true });
});

router.delete('/:id/tracks/:trackId', requireAuth, (req, res) => {
  if (!ownsPlaylist(req.params.id, req.session.userId)) {
    return res.status(403).json({ error: 'Only the playlist owner can remove tracks.' });
  }
  db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?').run(req.params.id, req.params.trackId);
  res.json({ ok: true });
});

module.exports = router;
