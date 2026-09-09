const { Parser } = require('json2csv');
const Lead = require('../models/Lead');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, paginated } = require('../utils/apiResponse');

const buildLeadFilter = (req) => {
  const { status, priority, pipelineCategory, assignedAdminId, search } = req.query;
  const filter = {};

  if (req.user.role !== 'super_admin') {
    filter.assignedAdminId = req.user._id;
  } else if (assignedAdminId) {
    filter.assignedAdminId = assignedAdminId;
  }

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (pipelineCategory) filter.pipelineCategory = pipelineCategory;
  if (search) filter.$text = { $search: search };

  return filter;
};

// GET /api/leads
const listLeads = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25 } = req.query;
  const filter = buildLeadFilter(req);

  const [leads, total] = await Promise.all([
    Lead.find(filter)
      
      .populate('campaign', 'name')
      .sort({ dateCaptured: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Lead.countDocuments(filter),
  ]);

  paginated(res, leads, page, limit, total, 'Leads fetched');
});

// GET /api/leads/:id
const getLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id)
    
    .populate('campaign', 'name');
  if (!lead) throw new ApiError(404, 'Lead not found.');
  ok(res, lead, 'Lead fetched');
});

// POST /api/leads  (addLead)
const createLead = asyncHandler(async (req, res) => {
  const lead = await Lead.create({
    ...req.body,
    dateCaptured: new Date(),
    interactions: [
      {
        type: 'note',
        note: `Manually added by ${req.user.name}`,
        performedBy: req.user.name,
      },
    ],
  });
  ok(res, lead, `Lead "${lead.fullName}" created successfully`, 201);
});

// PATCH /api/leads/:id/status  (updateLeadStatus)
const updateLeadStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found.');

  lead.interactions.unshift({
    type: 'status_change',
    note: note || `Status changed from ${lead.status.toUpperCase()} to ${status.toUpperCase()} by ${req.user.name}`,
    performedBy: req.user.name,
  });
  lead.status = status;
  if (status !== 'new') lead.lastContactedDate = new Date();
  await lead.save();

  ok(res, lead, `Lead status updated to ${status.toUpperCase()}`);
});

// PATCH /api/leads/:id/assign  (assignLead)
const assignLead = asyncHandler(async (req, res) => {
  const { adminId } = req.body;
  const targetAdmin = await User.findById(adminId);
  if (!targetAdmin) throw new ApiError(404, 'Target admin not found.');

  const lead = await Lead.findByIdAndUpdate(
    req.params.id,
    {
      assignedAdminId: adminId,
      $push: { interactions: { type: 'assignment', note: `Reassigned to ${targetAdmin.name}`, performedBy: req.user.name } },
    },
    { new: true }
  );
  if (!lead) throw new ApiError(404, 'Lead not found.');

  ok(res, lead, `Lead assigned to ${targetAdmin.name}`);
});

// PATCH /api/leads/:id/follow-up/toggle
const toggleLeadFollowUp = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found.');
  lead.followUpRequired = !lead.followUpRequired;
  await lead.save();
  ok(res, lead, lead.followUpRequired ? 'Follow-up flagged' : 'Follow-up resolved');
});

// PATCH /api/leads/:id/pipeline-category/toggle
const toggleLeadPipelineCategory = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found.');
  lead.pipelineCategory = lead.pipelineCategory === 'active' ? 'non_active' : 'active';
  await lead.save();
  ok(res, lead, `Moved to ${lead.pipelineCategory === 'active' ? 'Active Inbound' : 'Non-Active / Closed'}`);
});

// PATCH /api/leads/:id/follow-up-action
const updateLeadFollowUpAction = asyncHandler(async (req, res) => {
  const { action, date } = req.body;
  const lead = await Lead.findByIdAndUpdate(
    req.params.id,
    { nextFollowUpAction: action, nextFollowUpDate: date, followUpRequired: true },
    { new: true }
  );
  if (!lead) throw new ApiError(404, 'Lead not found.');
  ok(res, lead, 'Follow-up task updated');
});

// POST /api/leads/:id/notes  (adds a note interaction)
const addLeadNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  const lead = await Lead.findByIdAndUpdate(
    req.params.id,
    { $push: { interactions: { type: 'note', note, performedBy: req.user.name } } },
    { new: true }
  );
  if (!lead) throw new ApiError(404, 'Lead not found.');
  ok(res, lead, 'Note added to lead');
});

// GET /api/leads/export/csv
const exportLeadsCSV = asyncHandler(async (req, res) => {
  const filter = buildLeadFilter(req);
  const leads = await Lead.find(filter).lean();

  if (!leads.length) throw new ApiError(400, 'No leads available to export.');

  const fields = [
    '_id',
    'fullName',
    'jobTitle',
    'email',
    'phone',
    'company',
    'employeeCount',
    'requirements',
    'source',
    'campaignName',
    'status',
    'isTestingLead',
    'testingToolRemark',
    'estimatedValue',
    'score',
    'dateCaptured',
  ];
  const parser = new Parser({ fields });
  const csv = parser.parse(leads);

  res.header('Content-Type', 'text/csv');
  res.attachment(`meta_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
  res.send(csv);
});

// DELETE /api/leads/:id
const deleteLead = asyncHandler(async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw new ApiError(404, 'Lead not found.');

  await Lead.findByIdAndDelete(req.params.id);
  ok(res, { id: req.params.id }, 'Lead deleted successfully');
});

// POST /api/leads/bulk-delete
const bulkDeleteLeads = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'Please provide an array of lead IDs to delete.');
  }

  const result = await Lead.deleteMany({ _id: { $in: ids } });
  ok(res, { deletedCount: result.deletedCount, ids }, `${result.deletedCount} leads deleted successfully`);
});

module.exports = {
  listLeads,
  getLead,
  createLead,
  updateLeadStatus,
  assignLead,
  toggleLeadFollowUp,
  toggleLeadPipelineCategory,
  updateLeadFollowUpAction,
  addLeadNote,
  exportLeadsCSV,
  deleteLead,
  bulkDeleteLeads,
};
