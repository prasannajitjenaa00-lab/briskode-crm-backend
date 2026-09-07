const express = require('express');
const ctrl = require('../controllers/leadController');
const { protect, requirePermission } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { createLeadValidator, updateStatusValidator } = require('../validators/leadValidators');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.listLeads);
router.get('/export/csv', requirePermission('canExportData'), ctrl.exportLeadsCSV);
router.get('/:id', ctrl.getLead);
router.post('/', requirePermission('canManageLeads'), createLeadValidator, validate, ctrl.createLead);
router.patch('/:id/status', requirePermission('canManageLeads'), updateStatusValidator, validate, ctrl.updateLeadStatus);
router.patch('/:id/assign', requirePermission('canManageLeads'), ctrl.assignLead);
router.patch('/:id/follow-up/toggle', ctrl.toggleLeadFollowUp);
router.patch('/:id/pipeline-category/toggle', ctrl.toggleLeadPipelineCategory);
router.patch('/:id/follow-up-action', ctrl.updateLeadFollowUpAction);
router.post('/:id/notes', ctrl.addLeadNote);

module.exports = router;
