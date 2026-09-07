const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser, emitToSuperAdmins } = require('../socket');

/**
 * Create a notification for a single user and push it in realtime.
 */
const notifyUser = async (userId, { type, title, message, refId, link }) => {
  const notification = await Notification.create({ user: userId, type, title, message, refId, link });
  emitToUser(userId.toString(), 'notification:new', notification);
  return notification;
};

/**
 * Notify all super admins (e.g. new lead, invoice paid).
 */
const notifySuperAdmins = async ({ type, title, message, refId, link }) => {
  const superAdmins = await User.find({ role: 'super_admin' }).select('_id');
  const notifications = await Notification.insertMany(
    superAdmins.map((u) => ({ user: u._id, type, title, message, refId, link }))
  );
  emitToSuperAdmins('notification:new', { type, title, message, refId, link });
  return notifications;
};

module.exports = { notifyUser, notifySuperAdmins };
