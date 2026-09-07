const mongoose = require('mongoose');

const customerTimelineSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    type: { type: String, enum: ['note', 'campaign', 'invoice', 'whatsapp', 'lead_history', 'status_change'], required: true },
    title: String,
    description: String,
    refId: mongoose.Schema.Types.ObjectId,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomerTimeline', customerTimelineSchema);
