const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    channel: { type: String, enum: ['whatsapp', 'email', 'sms'], default: 'whatsapp' },
    templateName: String,
    messageBody: String,
    mediaUrl: String,
    audienceFilter: mongoose.Schema.Types.Mixed,
    recipientCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'queued', 'sending', 'completed', 'failed'], default: 'draft', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scheduledAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Broadcast', broadcastSchema);
