const express = require('express');
const ctrl = require('../controllers/campaignController');
const { protect, requirePermission } = require('../middlewares/auth');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.listCampaigns);
router.get('/:id', ctrl.getCampaign);
router.post('/', ctrl.createCampaign);
router.patch('/:id', ctrl.updateCampaign);
router.patch('/:id/toggle-status', ctrl.toggleCampaignStatus);
router.delete('/:id', ctrl.deleteCampaign);

module.exports = router;
