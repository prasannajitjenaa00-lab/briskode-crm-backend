const express = require('express');
const ctrl = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.listNotifications);
router.patch('/read-all', ctrl.markAllAsRead);
router.patch('/:id/read', ctrl.markAsRead);
router.delete('/:id', ctrl.clearNotification);

module.exports = router;
