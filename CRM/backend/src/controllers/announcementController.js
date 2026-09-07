const Announcement = require('../models/Announcement');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok } = require('../utils/apiResponse');
const { emitBroadcast } = require('../socket');

// GET /api/announcements
const listAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find().sort({ createdAt: -1 });
  ok(res, announcements, 'Announcements fetched');
});

// POST /api/announcements  (createAnnouncement)
const createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.create({
    ...req.body,
    authorId: req.user._id,
    authorName: req.user.name,
    authorAvatar: req.user.avatar,
    acknowledgedUserIds: [req.user._id],
  });

  emitBroadcast('announcement:new', announcement);
  ok(res, announcement, 'Broadcast announcement published to team', 201);
});

// PATCH /api/announcements/:id/acknowledge
const acknowledgeAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) throw new ApiError(404, 'Announcement not found.');

  if (!announcement.acknowledgedUserIds.includes(req.user._id)) {
    announcement.acknowledgedUserIds.push(req.user._id);
    await announcement.save();
  }
  ok(res, announcement, 'Announcement marked as acknowledged');
});

// DELETE /api/announcements/:id
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id);
  if (!announcement) throw new ApiError(404, 'Announcement not found.');
  ok(res, null, 'Announcement removed');
});

module.exports = { listAnnouncements, createAnnouncement, acknowledgeAnnouncement, deleteAnnouncement };
