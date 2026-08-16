const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { trackUpload } = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const { uploadsDir } = require('../config');
const { resolveExternalTrack, tryFetchSoundCloudThumbnail } = require('../lib/externalTrack');
const { GENRES, attachGenres, GENRES_SUBQUERY } = require('../lib/genres');

const router = express.Router();

const TRACK_SELECT = `
  SELECT
    tracks.*,
    users.username AS artist_username,
    users.avatar_path AS artist_avatar,
    (SELECT COUNT(*) FROM likes WHERE likes.track_id = tracks.id) AS like_count,
    ${GENRES_SUBQUERY}
  FROM tracks
  JOIN users ON tracks.user_id = users.id
`;

function withLikedByMe(track, viewerId) {
  if (!viewerId) return { ...track, liked_by_me: false };
  const row = db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND track_id = ?').get(viewerId, track.id);
  return { ...track, liked_by_me: !!row };
}

function finalize(track, viewerId) {
  return withLikedByMe(attachGenres(track), viewerId);
}

// A path is only safe to unlink if it's actually one of ours — cover_path
// can be an external thumbnail URL (e.g. YouTube's) for linked tracks.
function unlinkIfLocal(relativePath) {
  if (!relativePath || !relativePath.startsWith('/uploads/')) return;
  const absolutePath = path.join(uploadsDir, relativePath.replace(/^\/uploads\//, ''));
  fs.unlink(absolutePath, () => {});
}

// GET /api/tracks?search=&genre=Jazz&genre=Funk&sort=newest|popular
// Multiple ?genre= params match tracks with ANY of those genres.
router.get('/', (req, res) => {
  const { search = '', sort = 'newest' } = req.query;
  const genreFilter = req.query.genre ? [].concat(req.query.genre) : [];

  let query = `${TRACK_SELECT} WHERE 1 = 1`;
  const params = [];

  if (search) {
    query += ` AND (
      tracks.title LIKE ? OR tracks.artist LIKE ? OR EXISTS (
        SELECT 1 FROM track_genres WHERE track_genres.track_id = tracks.id AND track_genres.genre LIKE ?
      )
    )`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (genreFilter.length) {
    // Match tracks that have ALL selected genres, not just any one of them
    // — count how many of the selected genres this track actually has,
    // and require that to equal the number selected.
    const placeholders = genreFilter.map(() => '?').join(', ');
    query += ` AND (
      SELECT COUNT(DISTINCT track_genres.genre) FROM track_genres
      WHERE track_genres.track_id = tracks.id AND track_genres.genre IN (${placeholders})
    ) = ?`;
    params.push(...genreFilter, genreFilter.length);
  }

  query += sort === 'popular' ? ' ORDER BY tracks.play_count DESC' : ' ORDER BY tracks.created_at DESC';

  const tracks = db.prepare(query).all(...params);
  res.json(tracks.map((t) => finalize(t, req.session.userId)));
});

// GET /api/tracks/liked — must be registered before /:id.
router.get('/liked', requireAuth, (req, res) => {
  const tracks = db
    .prepare(
      `${TRACK_SELECT}
       JOIN likes ON likes.track_id = tracks.id
       WHERE likes.user_id = ?
       ORDER BY likes.created_at DESC`
    )
    .all(req.session.userId);
  res.json(tracks.map((t) => finalize(t, req.session.userId)));
});

router.get('/:id', (req, res) => {
  const track = db.prepare(`${TRACK_SELECT} WHERE tracks.id = ?`).get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found.' });
  res.json(finalize(track, req.session.userId));
});

// POST /api/tracks — either a multipart file upload (existing "audio" field)
// or a pasted "external_url" (YouTube/SoundCloud). One or more "genre"
// fields select from the predefined list (all optional).
router.post(
  '/',
  requireAuth,
  trackUpload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  async (req, res) => {
    const { title, artist, description = '', duration = 0, external_url = '' } = req.body;
    const audioFile = req.files?.audio?.[0];
    const coverFile = req.files?.cover?.[0];

    if (!title || !artist) {
      return res.status(400).json({ error: 'Title and artist are required.' });
    }

    const genres = req.body.genre ? [...new Set([].concat(req.body.genre))] : [];
    if (genres.some((g) => !GENRES.includes(g))) {
      return res.status(400).json({ error: 'One or more selected genres are not valid options.' });
    }

    let audioPath = '';
    let coverPath = coverFile ? `/uploads/covers/${coverFile.filename}` : null;
    let sourceType = 'upload';
    let externalUrl = null;
    let embedUrl = null;
    let trackDuration = Number(duration) || 0;

    if (external_url) {
      const resolved = resolveExternalTrack(external_url);
      if (!resolved) {
        return res.status(400).json({ error: "That doesn't look like a YouTube or SoundCloud link." });
      }
      sourceType = resolved.sourceType;
      externalUrl = resolved.externalUrl;
      embedUrl = resolved.embedUrl;
      trackDuration = 0; // not available without extra API calls; omitted rather than guessed

      if (!coverPath && resolved.thumbnailUrl) {
        coverPath = resolved.thumbnailUrl;
      } else if (!coverPath && sourceType === 'soundcloud') {
        // Best-effort only — if this fails or times out, the track still saves fine.
        coverPath = await tryFetchSoundCloudThumbnail(externalUrl);
      }
    } else if (audioFile) {
      audioPath = `/uploads/audio/${audioFile.filename}`;
    } else {
      return res.status(400).json({ error: 'Upload an audio file or paste a YouTube/SoundCloud link.' });
    }

    const info = db
      .prepare(
        `INSERT INTO tracks
           (user_id, title, artist, description, audio_path, cover_path, duration, source_type, external_url, embed_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(req.session.userId, title, artist, description, audioPath, coverPath, trackDuration, sourceType, externalUrl, embedUrl);

    if (genres.length) {
      const insertGenre = db.prepare('INSERT INTO track_genres (track_id, genre) VALUES (?, ?)');
      genres.forEach((g) => insertGenre.run(info.lastInsertRowid, g));
    }

    const track = db.prepare(`${TRACK_SELECT} WHERE tracks.id = ?`).get(info.lastInsertRowid);
    res.status(201).json(finalize(track, req.session.userId));
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
  unlinkIfLocal(track.audio_path);
  unlinkIfLocal(track.cover_path);

  res.json({ ok: true });
});

module.exports = router;
