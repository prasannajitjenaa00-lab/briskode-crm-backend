const Campaign = require('../models/Campaign');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, paginated } = require('../utils/apiResponse');

// GET /api/campaigns
const listCampaigns = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, search } = req.query;
  const filter = {};

  if (req.user.role !== 'super_admin') {
    filter.assignedAdminId = req.user._id;
  }
  if (status) filter.status = status;
  if (search) filter.$text = { $search: search };

  const [campaigns, total] = await Promise.all([
    Campaign.find(filter)
      
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Campaign.countDocuments(filter),
  ]);

  paginated(res, campaigns, page, limit, total, 'Campaigns fetched');
});

// GET /api/campaigns/:id
const getCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new ApiError(404, 'Campaign not found.');
  ok(res, campaign, 'Campaign fetched');
});

// POST /api/campaigns
const createCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.create(req.body);

  if (campaign.assignedAdminId) {
    await User.findByIdAndUpdate(campaign.assignedAdminId, {
      $addToSet: { assignedCampaignIds: campaign._id },
    });
  }

  ok(res, campaign, 'Campaign created and assigned successfully', 201);
});

// PATCH /api/campaigns/:id
const updateCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!campaign) throw new ApiError(404, 'Campaign not found.');
  ok(res, campaign, 'Campaign updated successfully');
});

// PATCH /api/campaigns/:id/toggle-status
const toggleCampaignStatus = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new ApiError(404, 'Campaign not found.');

  campaign.status = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
  await campaign.save();

  ok(res, campaign, `Campaign status changed to ${campaign.status}`);
});

// DELETE /api/campaigns/:id
const deleteCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findByIdAndDelete(req.params.id);
  if (!campaign) throw new ApiError(404, 'Campaign not found.');
  ok(res, null, 'Campaign deleted');
});

module.exports = { listCampaigns, getCampaign, createCampaign, updateCampaign, toggleCampaignStatus, deleteCampaign };
