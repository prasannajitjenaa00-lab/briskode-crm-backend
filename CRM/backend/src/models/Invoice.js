const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, index: true },
    clientName: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    items: [invoiceItemSchema],
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'void'], default: 'draft', index: true },
    dueDate: Date,
    paidDate: String,
    assignedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    pdfUrl: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
