const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/apiResponse');

// GET /api/settings
const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ key: 'global' });
  if (!settings) settings = await Settings.create({ key: 'global' });
  ok(res, settings, 'Settings fetched');
});

// PATCH /api/settings  (updateSettings)
const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate({ key: 'global' }, req.body, {
    new: true,
    upsert: true,
    runValidators: true,
  });
  ok(res, settings, 'System settings updated and synced with Meta Graph API');
});

module.exports = { getSettings, updateSettings };
