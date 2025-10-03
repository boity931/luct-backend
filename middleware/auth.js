const jwt = require('jsonwebtoken');

module.exports = (roles = []) => (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (roles.length && !roles.includes(decoded.role))
      return res.status(403).json({ msg: 'Access denied' });

    next();
  } catch (err) {
    console.error('JWT verify error:', err.message);
    res.status(400).json({ msg: 'Invalid token' });
  }
};
