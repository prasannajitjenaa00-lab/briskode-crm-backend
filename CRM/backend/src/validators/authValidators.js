const { body } = require('express-validator');

const loginValidator = [
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidator = [body('email').isEmail().withMessage('A valid email is required')];

const resetPasswordValidator = [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

module.exports = { loginValidator, forgotPasswordValidator, resetPasswordValidator };
