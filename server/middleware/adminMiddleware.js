const authMiddleware = require('./authMiddleware');

const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.user_type !== 'admin') {
    return res.status(403).json({
      message: '관리자만 접근할 수 있습니다.',
    });
  }

  return next();
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  requireAdmin: [authMiddleware, adminMiddleware],
};
