const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok } = require('../utils/apiResponse');

// GET /api/notifications
const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
  ok(res, { notifications, unreadCount }, 'Notifications fetched');
});

// PATCH /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'Notification not found.');
  ok(res, notification, 'Notification marked as read');
});

// PATCH /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  ok(res, null, 'All notifications marked as read');
});

// DELETE /api/notifications/:id
const clearNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  ok(res, null, 'Notification cleared');
});

module.exports = { listNotifications, markAsRead, markAllAsRead, clearNotification };
