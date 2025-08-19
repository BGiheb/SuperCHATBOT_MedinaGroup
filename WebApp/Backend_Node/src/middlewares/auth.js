const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.id || !decoded.role) {
      return res.status(400).json({ message: 'Invalid token payload: missing id or role' });
    }
    console.log('Decoded token:', decoded); // Log for debugging
    req.user = decoded;
    next();
  } catch (e) {
    console.error('Token verification error:', e);
    return res.status(401).json({ message: 'Invalid token' });
  }
};