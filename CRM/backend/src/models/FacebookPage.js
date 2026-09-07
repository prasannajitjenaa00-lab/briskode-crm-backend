const mongoose = require('mongoose');

const facebookPageSchema = new mongoose.Schema(
  {
    metaAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'MetaAccount' },
    pageId: { type: String, required: true, unique: true },
    pageName: String,
    pageAccessToken: { type: String, select: false },
    subscribedToLeadgen: { type: Boolean, default: false },
    connected: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FacebookPage', facebookPageSchema);
