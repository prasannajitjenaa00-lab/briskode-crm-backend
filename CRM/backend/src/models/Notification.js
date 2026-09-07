const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    type: {
      type: String,
      enum: ['new_lead', 'campaign_completed', 'invoice_paid', 'broadcast_completed', 'lead_assigned', 'system'],
      default: 'system',
    },
    title: String,
    message: String,
    read: { type: Boolean, default: false, index: true },
    refId: mongoose.Schema.Types.ObjectId,
    link: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
