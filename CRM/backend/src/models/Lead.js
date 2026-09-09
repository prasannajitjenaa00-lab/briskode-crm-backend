const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['note', 'status_change', 'call', 'email', 'whatsapp', 'assignment'], default: 'note' },
    note: String,
    performedBy: String,
  },
  { _id: true }
);

const leadSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, index: true },
    phone: { type: String, index: true },
    company: String,
    source: { type: String, default: 'meta_lead_ad' },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },
    campaignName: String,
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'closed'],
      default: 'new',
      index: true,
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    tags: [String],
    estimatedValue: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    assignedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    dateCaptured: { type: Date, default: Date.now },
    lastContactedDate: Date,
    pipelineCategory: { type: String, enum: ['active', 'non_active'], default: 'active', index: true },
    followUpRequired: { type: Boolean, default: true },
    nextFollowUpAction: String,
    nextFollowUpDate: String,
    interactions: [interactionSchema],
    // HRMS Software Lead Ingestion Profile
    employeeCount: { type: String, default: '20-50 employees' },
    jobTitle: { type: String, default: 'HR Manager' },
    hrmsModules: { 
      type: [String], 
      default: ['Payroll & Compliance', 'Attendance & Leave'] 
    },
    currentSystem: { type: String, default: 'Manual Excel Spreadsheets' },
    implementationTimeline: { type: String, default: 'Within 15 Days' },
    demoStatus: { 
      type: String, 
      enum: ['requested', 'scheduled', 'completed', 'proposal_sent', 'none'], 
      default: 'requested' 
    },
    demoPreferredDate: String,
    demoTimeSlot: String,

    // Meta lead-ad origin fields
    metaLeadId: { type: String, unique: true, sparse: true, index: true },
    metaFormId: String,
    metaPageId: String,
    rawFieldData: mongoose.Schema.Types.Mixed,
    isDuplicate: { type: Boolean, default: false },
    duplicateOfLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    convertedToCustomer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

    // Lead Requirements & Testing Tool Flags
    requirements: { type: String },
    isTestingLead: { type: Boolean, default: false },
    testingToolRemark: { type: String },
  },
  { timestamps: true }
);

leadSchema.index({ fullName: 'text', email: 'text', company: 'text' });

module.exports = mongoose.model('Lead', leadSchema);
