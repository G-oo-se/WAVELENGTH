const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { trackUpload } = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const TRACK_SELECT = `
  SELECT
    tracks.*,
    users.username AS artist_username,
    users.avatar_path AS artist_avatar,
    (SELECT COUNT(*) FROM likes WHERE likes.track_id = tracks.id) AS like_count
  FROM tracks
  JOIN users ON tracks.user_id = users.id
`;

function withLikedByMe(track, viewerId) {
  if (!viewerId) return { ...track, liked_by_me: false };
  const row = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND track_id = ?').get(viewerId, track.id);
  return { ...track, liked_by_me: !!row };
}

// GET /api/tracks?search=&genre=&sort=newest|popular
router.get('/', (req, res) => {
  const { search = '', genre = '', sort = 'newest' } = req.query;

  let query = `${TRACK_SELECT} WHERE 1 = 1`;
  const params = [];

  if (search) {
    query += ' AND (tracks.title LIKE ? OR tracks.artist LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (genre) {
    query += ' AND tracks.genre = ?';
    params.push(genre);
  }

  query += sort === 'popular' ? ' ORDER BY tracks.play_count DESC' : ' ORDER BY tracks.created_at DESC';

  const tracks = db.prepare(query).all(...params);
  res.json(tracks.map((t) => withLikedByMe(t, req.session.userId)));
});

// GET /api/tracks/liked — tracks the current user has liked. Must be
// registered before /:id or Express would treat "liked" as an id.
router.get('/liked', requireAuth, (req, res) => {
  const tracks = db
    .prepare(
      `${TRACK_SELECT}
       JOIN likes ON likes.track_id = tracks.id
       WHERE likes.user_id = ?
       ORDER BY likes.created_at DESC`
    )
    .all(req.session.userId);
  res.json(tracks.map((t) => withLikedByMe(t, req.session.userId)));
});

router.get('/:id', (req, res) => {
  const track = db.prepare(`${TRACK_SELECT} WHERE tracks.id = ?`).get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found.' });
  res.json(withLikedByMe(track, req.session.userId));
});

router.post(
  '/',
  requireAuth,
  trackUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  (req, res) => {
    const { title, artist, genre = '', description = '', duration = 0 } = req.body;
    const audioFile = req.files?.audio?.[0];
    const coverFile = req.files?.cover?.[0];

    if (!title || !artist || !audioFile) {
      return res.status(400).json({ error: 'Title, artist, and an audio file are required.' });
    }

    const audioPath = `/uploads/audio/${audioFile.filename}`;
    const coverPath = coverFile ? `/uploads/covers/${coverFile.filename}` : null;

    const info = db
      .prepare(
        `INSERT INTO tracks (user_id, title, artist, genre, description, audio_path, cover_path, duration)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(req.session.userId, title, artist, genre, description, audioPath, coverPath, Number(duration) || 0);

    const track = db.prepare(`${TRACK_SELECT} WHERE tracks.id = ?`).get(info.lastInsertRowid);
    res.status(201).json(withLikedByMe(track, req.session.userId));
  }
);

router.post('/:id/play', (req, res) => {
  const result = db.prepare('UPDATE tracks SET play_count = play_count + 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Track not found.' });
  res.json({ ok: true });
});

router.post('/:id/like', requireAuth, (req, res) => {
  const track = db.prepare('SELECT id FROM tracks WHERE id = ?').get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found.' });

  db.prepare('INSERT OR IGNORE INTO likes (user_id, track_id) VALUES (?, ?)').run(req.session.userId, req.params.id);
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM likes WHERE track_id = ?').get(req.params.id);
  res.json({ liked_by_me: true, like_count: count });
});

router.delete('/:id/like', requireAuth, (req, res) => {
  db.prepare('DELETE FROM likes WHERE user_id = ? AND track_id = ?').run(req.session.userId, req.params.id);
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM likes WHERE track_id = ?').get(req.params.id);
  res.json({ liked_by_me: false, like_count: count });
});

router.delete('/:id', requireAuth, (req, res) => {
  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found.' });

  const requester = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.session.userId);
  const isOwner = track.user_id === req.session.userId;
  const isAdmin = !!(requester && requester.is_admin);

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "You don't have permission to delete this track." });
  }

  db.prepare('DELETE FROM tracks WHERE id = ?').run(req.params.id);

  const uploadsRoot = path.join(__dirname, '..', 'uploads');
  [track.audio_path, track.cover_path].filter(Boolean).forEach((relativePath) => {
    const absolutePath = path.join(uploadsRoot, relativePath.replace(/^\/uploads\//, ''));
    fs.unlink(absolutePath, () => {});
  });

  res.json({ ok: true });
});

module.exports = router;
