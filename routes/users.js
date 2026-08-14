const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { avatarUpload } = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function friendStatusBetween(viewerId, otherUserId) {
  if (!viewerId || viewerId === otherUserId) return null;
  const row = db
    .prepare(
      `SELECT * FROM friendships
       WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
    )
    .get(viewerId, otherUserId, otherUserId, viewerId);
  if (!row) return 'none';
  if (row.status === 'accepted') return 'friends';
  return row.requester_id === viewerId ? 'request_sent' : 'request_received';
}

// GET /api/users/me/friends — accepted friends + pending requests, both directions.
// Registered before /:username so "me" here never gets treated as a username.
router.get('/me/friends', requireAuth, (req, res) => {
  const uid = req.session.userId;

  const friends = db
    .prepare(
      `SELECT users.id, users.username, users.avatar_path
       FROM friendships
       JOIN users ON users.id = CASE WHEN friendships.requester_id = ? THEN friendships.addressee_id ELSE friendships.requester_id END
       WHERE friendships.status = 'accepted' AND (friendships.requester_id = ? OR friendships.addressee_id = ?)`
    )
    .all(uid, uid, uid);

  const incoming = db
    .prepare(
      `SELECT users.id, users.username, users.avatar_path
       FROM friendships JOIN users ON users.id = friendships.requester_id
       WHERE friendships.addressee_id = ? AND friendships.status = 'pending'`
    )
    .all(uid);

  const outgoing = db
    .prepare(
      `SELECT users.id, users.username, users.avatar_path
       FROM friendships JOIN users ON users.id = friendships.addressee_id
       WHERE friendships.requester_id = ? AND friendships.status = 'pending'`
    )
    .all(uid);

  res.json({ friends, incoming, outgoing });
});

// POST /api/users/me — update your own bio and/or avatar (multipart so both
// can travel in one request).
router.post('/me', requireAuth, avatarUpload.single('avatar'), (req, res) => {
  const { bio } = req.body;
  const avatarFile = req.file;

  if (avatarFile) {
    const existing = db.prepare('SELECT avatar_path FROM users WHERE id = ?').get(req.session.userId);
    if (existing?.avatar_path) {
      const oldAbsolute = path.join(__dirname, '..', 'uploads', existing.avatar_path.replace(/^\/uploads\//, ''));
      fs.unlink(oldAbsolute, () => {});
    }
    const avatarPath = `/uploads/avatars/${avatarFile.filename}`;
    db.prepare('UPDATE users SET avatar_path = ? WHERE id = ?').run(avatarPath, req.session.userId);
  }

  if (typeof bio === 'string') {
    if (bio.length > 300) return res.status(400).json({ error: 'Bio must be 300 characters or fewer.' });
    db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio, req.session.userId);
  }

  const user = db
    .prepare('SELECT id, username, email, bio, avatar_path, is_admin, created_at FROM users WHERE id = ?')
    .get(req.session.userId);
  res.json(user);
});

// GET /api/users/:username — public profile + their tracks
router.get('/:username', (req, res) => {
  const user = db
    .prepare('SELECT id, username, bio, avatar_path, is_admin, created_at FROM users WHERE username = ?')
    .get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const tracks = db
    .prepare(
      `SELECT tracks.*, ? AS artist_username, ? AS artist_avatar,
              (SELECT COUNT(*) FROM likes WHERE likes.track_id = tracks.id) AS like_count
       FROM tracks WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(user.username, user.avatar_path, user.id);

  const viewerId = req.session.userId;
  const tracksWithLikes = tracks.map((t) => ({
    ...t,
    liked_by_me: viewerId ? !!db.prepare('SELECT 1 FROM likes WHERE user_id = ? AND track_id = ?').get(viewerId, t.id) : false
  }));

  const friendCount = db
    .prepare(
      `SELECT COUNT(*) AS count FROM friendships WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)`
    )
    .get(user.id, user.id).count;

  res.json({
    ...user,
    friend_count: friendCount,
    friend_status: friendStatusBetween(viewerId, user.id),
    tracks: tracksWithLikes
  });
});

router.post('/:username/friend-request', requireAuth, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.id === req.session.userId) return res.status(400).json({ error: "You can't friend yourself." });

  const existing = db
    .prepare(
      `SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
    )
    .get(req.session.userId, target.id, target.id, req.session.userId);

  if (existing) {
    return res
      .status(409)
      .json({ error: existing.status === 'accepted' ? 'You are already friends.' : 'A friend request already exists between you two.' });
  }

  db.prepare('INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, ?)').run(
    req.session.userId,
    target.id,
    'pending'
  );
  res.status(201).json({ status: 'request_sent' });
});

router.post('/:username/friend-accept', requireAuth, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  const result = db
    .prepare(`UPDATE friendships SET status = 'accepted' WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`)
    .run(target.id, req.session.userId);

  if (result.changes === 0) return res.status(404).json({ error: 'No pending request from that user.' });
  res.json({ status: 'friends' });
});

// Cancels an outgoing request, declines an incoming one, or unfriends —
// all the same underlying operation: delete whatever row connects the two.
router.delete('/:username/friend', requireAuth, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  db.prepare(
    `DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
  ).run(req.session.userId, target.id, target.id, req.session.userId);

  res.json({ status: 'none' });
});

module.exports = router;
