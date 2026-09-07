const mongoose = require('mongoose');

const leadFormSchema = new mongoose.Schema(
  {
    page: { type: mongoose.Schema.Types.ObjectId, ref: 'FacebookPage' },
    formId: { type: String, required: true, unique: true },
    formName: String,
    status: { type: String, default: 'ACTIVE' },
    fieldsSchema: mongoose.Schema.Types.Mixed,
    linkedCampaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    autoAssignAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastSyncedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeadForm', leadFormSchema);
