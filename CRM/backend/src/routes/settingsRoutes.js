const express = require('express');
const ctrl = require('../controllers/settingsController');
const { protect, requirePermission } = require('../middlewares/auth');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.getSettings);
router.patch('/', requirePermission('canEditSettings'), ctrl.updateSettings);

module.exports = router;
