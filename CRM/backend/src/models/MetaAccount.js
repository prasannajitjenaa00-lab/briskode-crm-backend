const mongoose = require('mongoose');

const metaAccountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metaUserId: String,
    accessToken: { type: String, select: false },
    longLivedToken: { type: String, select: false },
    tokenExpiresAt: Date,
    adAccountId: String,
    businessId: String,
    connected: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MetaAccount', metaAccountSchema);
