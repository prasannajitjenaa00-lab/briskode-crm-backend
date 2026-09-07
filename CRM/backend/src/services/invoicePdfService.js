const PDFDocument = require('pdfkit');

/**
 * Streams a simple invoice PDF directly to the HTTP response.
 */
const streamInvoicePdf = (invoice, res) => {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${invoice.invoiceNumber}.pdf`);
  doc.pipe(res);

  doc.fontSize(20).text('INVOICE', { align: 'right' });
  doc.fontSize(10).text(`Invoice #: ${invoice.invoiceNumber}`, { align: 'right' });
  doc.text(`Status: ${invoice.status.toUpperCase()}`, { align: 'right' });
  doc.moveDown();

  doc.fontSize(12).text(`Bill To: ${invoice.clientName}`);
  if (invoice.dueDate) doc.text(`Due: ${new Date(invoice.dueDate).toDateString()}`);
  doc.moveDown();

  doc.fontSize(11).text('Description', 50, doc.y, { continued: true, width: 250 });
  doc.text('Qty', 300, doc.y, { continued: true, width: 60 });
  doc.text('Unit Price', 360, doc.y, { continued: true, width: 90 });
  doc.text('Total', 460, doc.y);
  doc.moveDown(0.5);

  (invoice.items || []).forEach((item) => {
    doc.fontSize(10).text(item.description, 50, doc.y, { continued: true, width: 250 });
    doc.text(String(item.quantity), 300, doc.y, { continued: true, width: 60 });
    doc.text(item.unitPrice.toFixed(2), 360, doc.y, { continued: true, width: 90 });
    doc.text(item.total.toFixed(2), 460, doc.y);
  });

  doc.moveDown();
  doc.text(`Subtotal: ${invoice.subtotal.toFixed(2)}`, { align: 'right' });
  doc.text(`Tax: ${invoice.taxAmount.toFixed(2)}`, { align: 'right' });
  doc.text(`Discount: -${invoice.discount.toFixed(2)}`, { align: 'right' });
  doc.fontSize(13).text(`Total: ${invoice.total.toFixed(2)}`, { align: 'right' });

  doc.end();
};

module.exports = { streamInvoicePdf };
