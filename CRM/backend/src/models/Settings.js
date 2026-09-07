const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    companyName: String,
    timezone: String,
    currency: { type: String, default: 'USD' },
    metaAppId: String,
    metaVerifyToken: String,
    whatsappPhoneNumberId: String,
    notificationPreferences: {
      emailOnNewLead: { type: Boolean, default: true },
      emailOnInvoicePaid: { type: Boolean, default: true },
    },
    extra: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
