const express = require('express');
const db = require('../db/database');
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/tracks?search=&genre=&sort=newest|popular
router.get('/', (req, res) => {
  const { search = '', genre = '', sort = 'newest' } = req.query;

  let query = `
    SELECT tracks.*, users.username AS artist_username
    FROM tracks
    JOIN users ON tracks.user_id = users.id
    WHERE 1 = 1
  `;
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
  res.json(tracks);
});

router.get('/:id', (req, res) => {
  const track = db
    .prepare(
      `SELECT tracks.*, users.username AS artist_username
       FROM tracks JOIN users ON tracks.user_id = users.id
       WHERE tracks.id = ?`
    )
    .get(req.params.id);

  if (!track) return res.status(404).json({ error: 'Track not found.' });
  res.json(track);
});

router.post(
  '/',
  requireAuth,
  upload.fields([
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

    const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(track);
  }
);

router.post('/:id/play', (req, res) => {
  const result = db.prepare('UPDATE tracks SET play_count = play_count + 1 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Track not found.' });
  res.json({ ok: true });
});

module.exports = router;
