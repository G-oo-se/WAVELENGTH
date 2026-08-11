function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'You need to be logged in to do that.' });
  }
  next();
}

module.exports = { requireAuth };
