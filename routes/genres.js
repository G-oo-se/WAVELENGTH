const express = require('express');
const { GENRES } = require('../lib/genres');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(GENRES);
});

module.exports = router;
