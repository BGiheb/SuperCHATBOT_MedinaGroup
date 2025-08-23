module.exports = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Unauthorized: No user or role found' });
    }
    if (requiredRole === 'ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    if (requiredRole === 'SUB_ADMIN' && !['ADMIN', 'SUB_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Admin or Sub-Admin access required' });
    }
    next();
  };
};