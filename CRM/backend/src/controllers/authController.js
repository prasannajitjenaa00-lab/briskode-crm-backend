const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok } = require('../utils/apiResponse');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');

const isProduction = process.env.NODE_ENV === 'production';
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const issueTokens = async (res, user, req) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await RefreshToken.create({
    user: user._id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
  return accessToken;
};

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'This account has been deactivated.');
  }

  const accessToken = await issueTokens(res, user, req);
  user.lastActive = 'Active now';
  await user.save({ validateBeforeSave: false });

  const safeUser = await User.findById(user._id);
  ok(res, { user: safeUser, accessToken }, 'Logged in successfully');
});

// POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, 'No refresh token provided.');

  const stored = await RefreshToken.findOne({ token, revoked: false });
  if (!stored) throw new ApiError(401, 'Refresh token invalid or revoked.');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Refresh token expired or invalid.');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, 'User no longer exists.');

  const accessToken = generateAccessToken(user);
  ok(res, { accessToken }, 'Token refreshed');
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await RefreshToken.updateOne({ token }, { revoked: true });
  }
  res.clearCookie('refreshToken', REFRESH_COOKIE_OPTS);
  ok(res, null, 'Logged out successfully');
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  ok(res, req.user, 'Current user');
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  // Always respond the same way to avoid leaking which emails exist
  if (!user) {
    return ok(res, null, 'If that email exists, a reset link has been sent.');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  // In production, email this link via nodemailer/emailService.
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  ok(res, process.env.NODE_ENV === 'production' ? null : { resetUrl }, 'If that email exists, a reset link has been sent.');
});

// POST /api/auth/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password');

  if (!user) throw new ApiError(400, 'Reset token is invalid or has expired.');

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  await RefreshToken.updateMany({ user: user._id }, { revoked: true });

  ok(res, null, 'Password reset successfully. Please log in again.');
});

module.exports = { login, refresh, logout, getMe, forgotPassword, resetPassword };
