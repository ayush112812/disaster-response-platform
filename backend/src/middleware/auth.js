const users = {
  netrunnerX: { role: 'admin' },
  reliefAdmin: { role: 'admin' },
  citizen1: { role: 'contributor' },
  volunteer2: { role: 'contributor' },
};

function mockAuth(req, res, next) {
  const user = req.headers['x-user'] || 'citizen1'; // default user
  req.user = { id: user, ...users[user] };
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user && req.user.role === role) return next();
    return res.status(403).json({ error: 'Forbidden: insufficient role' });
  };
}

module.exports = { mockAuth, requireRole };