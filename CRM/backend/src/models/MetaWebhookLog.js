const mongoose = require('mongoose');

const metaWebhookLogSchema = new mongoose.Schema(
  {
    objectType: String,
    payload: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ['received', 'processed', 'failed', 'retrying'], default: 'received', index: true },
    error: String,
    attempts: { type: Number, default: 0 },
    processedLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MetaWebhookLog', metaWebhookLogSchema);
