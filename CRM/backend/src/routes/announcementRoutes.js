const express = require('express');
const ctrl = require('../controllers/announcementController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.listAnnouncements);
router.post('/', restrictTo('super_admin'), ctrl.createAnnouncement);
router.patch('/:id/acknowledge', ctrl.acknowledgeAnnouncement);
router.delete('/:id', restrictTo('super_admin'), ctrl.deleteAnnouncement);

module.exports = router;
