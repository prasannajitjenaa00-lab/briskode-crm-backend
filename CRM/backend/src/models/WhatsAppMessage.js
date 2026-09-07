const mongoose = require('mongoose');

const whatsAppMessageSchema = new mongoose.Schema(
  {
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    waMessageId: { type: String, index: true },
    from: String,
    to: String,
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    type: { type: String, enum: ['text', 'image', 'video', 'document', 'template'], default: 'text' },
    body: String,
    mediaUrl: String,
    templateName: String,
    status: { type: String, enum: ['queued', 'sent', 'delivered', 'read', 'failed'], default: 'queued', index: true },
    broadcast: { type: mongoose.Schema.Types.ObjectId, ref: 'Broadcast' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
