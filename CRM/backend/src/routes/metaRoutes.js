const express = require('express');
const ctrl = require('../controllers/metaController');
const { protect, restrictTo } = require('../middlewares/auth');
const { webhookLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// Public webhook endpoints (Meta calls these directly — no auth, verified via hub.verify_token / signature)
router.get('/webhook', ctrl.verifyWebhook);
router.post('/webhook', webhookLimiter, ctrl.receiveWebhook);

// Authenticated management endpoints
router.use(protect);
router.get('/webhook-logs', restrictTo('super_admin'), ctrl.listWebhookLogs);
router.post('/webhook-logs/:id/retry', restrictTo('super_admin'), ctrl.retryWebhookLog);
router.post('/connect', restrictTo('super_admin'), ctrl.connectMetaAccount);
router.get('/pages', ctrl.listPages);
router.post('/pages/:pageId/sync-forms', restrictTo('super_admin'), ctrl.syncLeadForms);
router.get('/forms', ctrl.listLeadForms);
router.patch('/forms/:id', restrictTo('super_admin'), ctrl.updateLeadForm);

module.exports = router;
