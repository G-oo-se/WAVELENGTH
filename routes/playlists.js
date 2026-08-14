const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function ownsPlaylist(playlistId, userId) {
  const row = db.prepare('SELECT user_id FROM playlists WHERE id = ?').get(playlistId);
  return !!row && row.user_id === userId;
}

// GET /api/playlists — the current user's own playlists, with track counts
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

router.post('/', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Give the playlist a name.' });
  if (name.length > 60) return res.status(400).json({ error: 'Playlist names must be 60 characters or fewer.' });

  const info = db.prepare('INSERT INTO playlists (user_id, name) VALUES (?, ?)').run(req.session.userId, name.trim());
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ ...playlist, track_count: 0 });
});

// Playlists are publicly viewable (like the rest of the site) — only
// mutating one requires ownership, checked per-route below.
router.get('/:id', (req, res) => {
  const playlist = db
    .prepare(
      `SELECT playlists.*, users.username AS owner_username
       FROM playlists JOIN users ON users.id = playlists.user_id
       WHERE playlists.id = ?`
    )
    .get(req.params.id);
  if (!playlist) return res.status(404).json({ error: 'Playlist not found.' });

  const tracks = db
    .prepare(
      `SELECT tracks.*, users.username AS artist_username, users.avatar_path AS artist_avatar,
              (SELECT COUNT(*) FROM likes WHERE likes.track_id = tracks.id) AS like_count
       FROM playlist_tracks
       JOIN tracks ON tracks.id = playlist_tracks.track_id
       JOIN users ON users.id = tracks.user_id
       WHERE playlist_tracks.playlist_id = ?
       ORDER BY playlist_tracks.position ASC, playlist_tracks.added_at ASC`
    )
    .all(req.params.id);

  const viewerId = req.session.userId;
  res.json({
    ...playlist,
    is_owner: viewerId === playlist.user_id,
    tracks: tracks.map((t) => ({
      ...t,
      liked_by_me: viewerId ? !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND track_id = ?').get(viewerId, t.id) : false
    }))
  });
});

router.patch('/:id', requireAuth, (req, res) => {
  if (!ownsPlaylist(req.params.id, req.session.userId)) {
    return res.status(403).json({ error: 'Only the playlist owner can rename it.' });
  }
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Give the playlist a name.' });

  db.prepare('UPDATE playlists SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', requireAuth, (req, res) => {
  if (!ownsPlaylist(req.params.id, req.session.userId)) {
    return res.status(403).json({ error: 'Only the playlist owner can delete it.' });
  }
  db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
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
