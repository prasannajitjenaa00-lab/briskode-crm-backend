const Invoice = require('../models/Invoice');
const CustomerTimeline = require('../models/CustomerTimeline');
const asyncHandler = require('../utils/asyncHandler');
const { ApiError, ok, paginated } = require('../utils/apiResponse');
const { notifySuperAdmins } = require('../services/notificationService');
const { streamInvoicePdf } = require('../services/invoicePdfService');

const buildInvoiceFilter = (req) => {
  const filter = {};
  if (req.user.role !== 'super_admin') filter.assignedAdminId = req.user._id;
  if (req.query.status) filter.status = req.query.status;
  return filter;
};

const computeTotals = (items = [], taxRate = 0, discount = 0) => {
  const subtotal = items.reduce((sum, i) => sum + (i.quantity || 1) * (i.unitPrice || 0), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount - discount;
  return { subtotal, taxAmount, total };
};

// GET /api/invoices
const listInvoices = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25 } = req.query;
  const filter = buildInvoiceFilter(req);

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      
      .populate('customer', 'company fullName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Invoice.countDocuments(filter),
  ]);

  paginated(res, invoices, page, limit, total, 'Invoices fetched');
});

// GET /api/invoices/:id
const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('customer');
  if (!invoice) throw new ApiError(404, 'Invoice not found.');
  ok(res, invoice, 'Invoice fetched');
});

// POST /api/invoices  (createInvoice)
const createInvoice = asyncHandler(async (req, res) => {
  const { items = [], taxRate = 0, discount = 0 } = req.body;
  const totals = computeTotals(
    items.map((i) => ({ ...i, total: (i.quantity || 1) * (i.unitPrice || 0) })),
    taxRate,
    discount
  );

  const count = await Invoice.countDocuments();
  const invoiceNumber = `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(3, '0')}`;

  const invoice = await Invoice.create({
    ...req.body,
    items: items.map((i) => ({ ...i, total: (i.quantity || 1) * (i.unitPrice || 0) })),
    invoiceNumber,
    ...totals,
  });

  if (invoice.customer) {
    await CustomerTimeline.create({
      customer: invoice.customer,
      type: 'invoice',
      title: `Invoice ${invoiceNumber} generated`,
      description: `Total: ${invoice.total}`,
      refId: invoice._id,
      performedBy: req.user._id,
    });
  }

  ok(res, invoice, `Invoice ${invoiceNumber} generated for ${invoice.clientName}`, 201);
});

// PATCH /api/invoices/:id/status  (updateInvoiceStatus)
const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError(404, 'Invoice not found.');

  invoice.status = status;
  if (status === 'paid') {
    invoice.paidDate = new Date().toISOString().split('T')[0];
    await notifySuperAdmins({
      type: 'invoice_paid',
      title: 'Invoice Paid',
      message: `Invoice ${invoice.invoiceNumber} for ${invoice.clientName} was marked paid.`,
      refId: invoice._id,
      link: `/invoices/${invoice._id}`,
    });
  }
  await invoice.save();

  ok(res, invoice, `Invoice status updated to ${status.toUpperCase()}`);
});

// DELETE /api/invoices/:id
const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByIdAndDelete(req.params.id);
  if (!invoice) throw new ApiError(404, 'Invoice not found.');
  ok(res, null, 'Invoice deleted successfully');
});

// GET /api/invoices/:id/pdf
const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new ApiError(404, 'Invoice not found.');
  streamInvoicePdf(invoice, res);
});

module.exports = { listInvoices, getInvoice, createInvoice, updateInvoiceStatus, deleteInvoice, downloadInvoicePdf };
