const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, unique: true, sparse: true },
    platform: { type: String, enum: ['facebook', 'instagram', 'both'], default: 'both' },
    objective: { type: String, default: 'LEAD_GENERATION' },
    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'], default: 'DRAFT', index: true },
    dailyBudget: { type: Number, default: 0 },
    totalBudget: { type: Number, default: 0 },
    spend: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    leadsCount: { type: Number, default: 0 },
    cpl: { type: Number, default: 0 },
    roas: { type: Number, default: 0 },
    assignedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    creative: {
      headline: String,
      primaryText: String,
      callToAction: String,
      mediaUrl: String,
      mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
      format: String,
      formName: String,
      targetUrl: String,
    },
    targetAudience: {
      ageRange: String,
      locations: [String],
      interests: [String],
    },
    metaCampaignId: { type: String, index: true },
    metaAdAccountId: String,
    pixelId: String,
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true }
);

campaignSchema.index({ name: 'text', code: 'text' });

module.exports = mongoose.model('Campaign', campaignSchema);
