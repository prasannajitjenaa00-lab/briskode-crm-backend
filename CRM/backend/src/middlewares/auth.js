const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../utils/apiResponse');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw new ApiError(401, 'Not authenticated. Please log in.');
  }

  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  const user = await User.findById(decoded.id);

  if (!user || user.status !== 'active') {
    throw new ApiError(401, 'User no longer exists or is inactive.');
  }

  req.user = user;
  next();
});

const restrictTo = (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to perform this action.');
    }
    next();
  };

const requirePermission = (permission) =>
  (req, res, next) => {
    if (req.user.role === 'super_admin') return next();
    if (!req.user.permissions || !req.user.permissions[permission]) {
      throw new ApiError(403, `Missing required permission: ${permission}`);
    }
    next();
  };

module.exports = { protect, restrictTo, requirePermission };
