const mongoose = require('mongoose');

const touchpointSchema = new mongoose.Schema(
  {
    date: String,
    channel: String,
    description: String,
  },
  { _id: true }
);

const customerSchema = new mongoose.Schema(
  {
    fullName: String,
    company: { type: String, required: true },
    email: String,
    phone: String,
    status: { type: String, enum: ['active', 'churned', 'onboarding', 'paused'], default: 'active', index: true },
    pipelineCategory: { type: String, enum: ['active', 'non_active'], default: 'active', index: true },
    followUpRequired: { type: Boolean, default: true },
    nextFollowUpAction: String,
    nextFollowUpDate: String,
    assignedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    originLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    lifetimeValue: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    touchpoints: [touchpointSchema],
  },
  { timestamps: true }
);

customerSchema.index({ company: 'text', fullName: 'text', email: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
