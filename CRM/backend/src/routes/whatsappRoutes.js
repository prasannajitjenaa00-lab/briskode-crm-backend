const express = require('express');
const ctrl = require('../controllers/whatsappController');
const { protect } = require('../middlewares/auth');
const { webhookLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

// Public webhook endpoints
router.get('/webhook', ctrl.verifyWebhook);
router.post('/webhook', webhookLimiter, ctrl.receiveWebhook);

// Authenticated endpoints
router.use(protect);
router.get('/conversations/:phone', ctrl.getConversation);
router.post('/send', ctrl.sendMessage);
router.get('/broadcasts', ctrl.listBroadcasts);
router.post('/broadcasts', ctrl.createBroadcast);

module.exports = router;
