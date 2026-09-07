const express = require('express');
const ctrl = require('../controllers/customerController');
const { protect } = require('../middlewares/auth');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.listCustomers);
router.get('/:id', ctrl.getCustomer);
router.get('/:id/360', ctrl.getCustomer360);
router.post('/', ctrl.createCustomer);
router.patch('/:id', ctrl.updateCustomer);
router.post('/:id/notes', ctrl.addCustomerNote);
router.patch('/:id/follow-up/toggle', ctrl.toggleCustomerFollowUp);
router.patch('/:id/pipeline-category/toggle', ctrl.toggleCustomerPipelineCategory);
router.patch('/:id/follow-up-action', ctrl.updateCustomerFollowUpAction);

module.exports = router;
