const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Campaign = require('../models/Campaign');
const Invoice = require('../models/Invoice');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');

// GET /api/dashboard/kpis
const getDashboardKPIs = asyncHandler(async (req, res) => {
  const scope = req.user.role === 'super_admin' ? {} : { assignedAdminId: req.user._id };

  const [totalLeads, newLeadsToday, wonLeads, activeCampaigns, totalCustomers, revenue, pendingInvoices] =
    await Promise.all([
      Lead.countDocuments(scope),
      Lead.countDocuments({ ...scope, dateCaptured: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
      Lead.countDocuments({ ...scope, status: 'won' }),
      Campaign.countDocuments({ ...scope, status: 'ACTIVE' }),
      Customer.countDocuments(scope),
      Invoice.aggregate([
        { $match: { ...scope, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Invoice.countDocuments({ ...scope, status: { $in: ['sent', 'overdue'] } }),
    ]);

  ok(res, {
    totalLeads,
    newLeadsToday,
    wonLeads,
    activeCampaigns,
    totalCustomers,
    totalRevenue: revenue[0]?.total || 0,
    pendingInvoices,
  }, 'Dashboard KPIs fetched');
});

// GET /api/dashboard/lead-analytics
const getLeadAnalytics = asyncHandler(async (req, res) => {
  const scope = req.user.role === 'super_admin' ? {} : { assignedAdminId: req.user._id };

  const byStatus = await Lead.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const bySource = await Lead.aggregate([{ $match: scope }, { $group: { _id: '$source', count: { $sum: 1 } } }]);

  ok(res, { byStatus, bySource }, 'Lead analytics fetched');
});

// GET /api/dashboard/campaign-analytics
const getCampaignAnalytics = asyncHandler(async (req, res) => {
  const scope = req.user.role === 'super_admin' ? {} : { assignedAdminId: req.user._id };
  const campaigns = await Campaign.find(scope).select('name spend leadsCount cpl roas ctr status');
  ok(res, campaigns, 'Campaign analytics fetched');
});

// GET /api/dashboard/revenue-report?months=6
const getRevenueReport = asyncHandler(async (req, res) => {
  const scope = req.user.role === 'super_admin' ? {} : { assignedAdminId: req.user._id };
  const months = Number(req.query.months) || 6;
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const monthly = await Invoice.aggregate([
    { $match: { ...scope, status: 'paid', createdAt: { $gte: since } } },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        total: { $sum: '$total' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  ok(res, monthly, 'Monthly revenue report fetched');
});

module.exports = { getDashboardKPIs, getLeadAnalytics, getCampaignAnalytics, getRevenueReport };
