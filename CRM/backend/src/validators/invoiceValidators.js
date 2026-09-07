const { body } = require('express-validator');

const createInvoiceValidator = [
  body('clientName').notEmpty().withMessage('Client name is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one invoice item is required'),
];

module.exports = { createInvoiceValidator };
