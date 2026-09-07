const { body } = require('express-validator');

const createLeadValidator = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Email must be valid'),
];

const updateStatusValidator = [
  body('status')
    .isIn(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'closed'])
    .withMessage('Invalid lead status'),
];

module.exports = { createLeadValidator, updateStatusValidator };
