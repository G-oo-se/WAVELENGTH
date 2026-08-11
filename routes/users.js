const express = require('express');
const db = require('../db/database');

const router = express.Router();

router.get('/:username', (req, res) => {
  const user = db
    .prepare('SELECT id, username, bio, created_at FROM users WHERE username = ?')
    .get(req.params.username);

  if (!user) return res.status(404).json({ error: 'User not found.' });

  const tracks = db
    .prepare(
      `SELECT tracks.*, ? AS artist_username
       FROM tracks WHERE user_id = ? ORDER BY created_at DESC`
    )
    .all(user.username, user.id);

  res.json({ ...user, tracks });
});

module.exports = router;
