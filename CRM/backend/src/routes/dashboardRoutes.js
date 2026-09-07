const express = require('express');
const ctrl = require('../controllers/dashboardController');
const { protect } = require('../middlewares/auth');

const router = express.Router();
router.use(protect);

router.get('/kpis', ctrl.getDashboardKPIs);
router.get('/lead-analytics', ctrl.getLeadAnalytics);
router.get('/campaign-analytics', ctrl.getCampaignAnalytics);
router.get('/revenue-report', ctrl.getRevenueReport);

module.exports = router;
