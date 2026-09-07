const express = require('express');
const ctrl = require('../controllers/invoiceController');
const { protect, requirePermission } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { createInvoiceValidator } = require('../validators/invoiceValidators');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.listInvoices);
router.get('/:id', ctrl.getInvoice);
router.get('/:id/pdf', ctrl.downloadInvoicePdf);
router.post('/', requirePermission('canCreateInvoices'), createInvoiceValidator, validate, ctrl.createInvoice);
router.patch('/:id/status', requirePermission('canCreateInvoices'), ctrl.updateInvoiceStatus);
router.delete('/:id', requirePermission('canCreateInvoices'), ctrl.deleteInvoice);

module.exports = router;
