const express = require('express');
const ctrl = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimiter');
const { loginValidator, forgotPasswordValidator, resetPasswordValidator } = require('../validators/authValidators');

const router = express.Router();

router.post('/login', authLimiter, loginValidator, validate, ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', protect, ctrl.getMe);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, ctrl.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidator, validate, ctrl.resetPassword);

module.exports = router;
