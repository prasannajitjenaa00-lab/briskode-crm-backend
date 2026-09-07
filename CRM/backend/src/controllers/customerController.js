const Customer = require('../models/Customer');
const CustomerTimeline = require('../models/CustomerTimeline');
const Invoice = require('../models/Invoice');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, paginated } = require('../utils/apiResponse');

const buildCustomerFilter = (req) => {
  const filter = {};
  if (req.user.role !== 'super_admin') filter.assignedAdminId = req.user._id;
  if (req.query.pipelineCategory) filter.pipelineCategory = req.query.pipelineCategory;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.$text = { $search: req.query.search };
  return filter;
};

// GET /api/customers
const listCustomers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25 } = req.query;
  const filter = buildCustomerFilter(req);

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Customer.countDocuments(filter),
  ]);

  paginated(res, customers, page, limit, total, 'Customers fetched');
});

// GET /api/customers/:id  (basic profile)
const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError(404, 'Customer not found.');
  ok(res, customer, 'Customer fetched');
});

// GET /api/customers/:id/360  (Customer 360 aggregate view: timeline, invoices, whatsapp history)
const getCustomer360 = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id).populate('originLead');
  if (!customer) throw new ApiError(404, 'Customer not found.');

  const [timeline, invoices, whatsappHistory] = await Promise.all([
    CustomerTimeline.find({ customer: customer._id }).sort({ createdAt: -1 }),
    Invoice.find({ customer: customer._id }).sort({ createdAt: -1 }),
    WhatsAppMessage.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(100),
  ]);

  ok(res, { customer, timeline, invoices, whatsappHistory }, 'Customer 360 profile fetched');
});

// POST /api/customers  (create, e.g. manually or via lead conversion)
const createCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.create(req.body);
  ok(res, customer, 'Customer created successfully', 201);
});

// PATCH /api/customers/:id
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!customer) throw new ApiError(404, 'Customer not found.');
  ok(res, customer, 'Customer updated successfully');
});

// POST /api/customers/:id/notes  (addCustomerNote)
const addCustomerNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError(404, 'Customer not found.');

  customer.notes = `${customer.notes || ''}\n[${new Date().toLocaleDateString()} - ${req.user.name}]: ${note}`;
  customer.touchpoints.push({
    date: new Date().toISOString().split('T')[0],
    channel: 'Internal Strategy Note',
    description: note,
  });
  await customer.save();

  await CustomerTimeline.create({
    customer: customer._id,
    type: 'note',
    title: 'Internal note added',
    description: note,
    performedBy: req.user._id,
  });

  ok(res, customer, 'Note added to customer profile');
});

// PATCH /api/customers/:id/follow-up/toggle
const toggleCustomerFollowUp = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError(404, 'Customer not found.');
  customer.followUpRequired = !customer.followUpRequired;
  await customer.save();
  ok(res, customer, customer.followUpRequired ? 'Follow-up scheduled' : 'Follow-up cleared');
});

// PATCH /api/customers/:id/pipeline-category/toggle
const toggleCustomerPipelineCategory = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError(404, 'Customer not found.');
  customer.pipelineCategory = customer.pipelineCategory === 'active' ? 'non_active' : 'active';
  await customer.save();
  ok(res, customer, `Account moved to ${customer.pipelineCategory === 'active' ? 'Active Retainer' : 'Non-Active / Archived'}`);
});

// PATCH /api/customers/:id/follow-up-action
const updateCustomerFollowUpAction = asyncHandler(async (req, res) => {
  const { action, date } = req.body;
  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    { nextFollowUpAction: action, nextFollowUpDate: date, followUpRequired: true },
    { new: true }
  );
  if (!customer) throw new ApiError(404, 'Customer not found.');
  ok(res, customer, 'Client follow-up action scheduled');
});

module.exports = {
  listCustomers,
  getCustomer,
  getCustomer360,
  createCustomer,
  updateCustomer,
  addCustomerNote,
  toggleCustomerFollowUp,
  toggleCustomerPipelineCategory,
  updateCustomerFollowUpAction,
};
