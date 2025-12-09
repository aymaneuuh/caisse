const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const dayjs = require('dayjs');

function buildTicketHtml(db, saleId) {
  const sale = db.get('SELECT * FROM sales WHERE id=?', [saleId]);
  const items = db.all('SELECT si.quantity, si.price, p.name FROM sale_items si JOIN products p ON p.id = si.product_id WHERE si.sale_id=?', [saleId]);
  const lines = items.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${i.price.toFixed(2)}€</td><td>${(i.price*i.quantity).toFixed(2)}€</td></tr>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:4px}</style></head><body>
    <h3>Caisse Snack</h3>
    <p>Ticket #${saleId} — ${dayjs(sale.created_at).format('YYYY-MM-DD HH:mm')}</p>
    <table><thead><tr><th>Produit</th><th>Qté</th><th>PU</th><th>Total</th></tr></thead><tbody>${lines}</tbody></table>
    <h4>Total: ${sale.total.toFixed(2)}€</h4>
  </body></html>`;
}

async function printTicket(db, saleId) {
  const outDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const pdfPath = path.join(outDir, `ticket-${saleId}.pdf`);

  const sale = db.get('SELECT * FROM sales WHERE id=?', [saleId]);
  if (!sale) return { ok: false, error: 'Sale not found' };

  // Generate PDF with PDFKit
  const doc = new PDFDocument({ margin: 36, size: 'A5' });
  doc.pipe(fs.createWriteStream(pdfPath));
  doc.fontSize(16).text('Caisse Snack', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Ticket #${saleId}`);
  doc.text(`Date: ${dayjs(sale.created_at).format('YYYY-MM-DD HH:mm')}`);
  doc.moveDown();

  const items = db.all('SELECT si.quantity, si.price, p.name FROM sale_items si JOIN products p ON p.id = si.product_id WHERE si.sale_id=?', [saleId]);
  items.forEach(i => {
    doc.text(`${i.name} x${i.quantity} @ ${i.price.toFixed(2)}€  = ${(i.price*i.quantity).toFixed(2)}€`);
  });
  doc.moveDown();
  doc.fontSize(14).text(`Total: ${sale.total.toFixed(2)}€`, { align: 'right' });
  doc.end();

  // Placeholder ESC/POS: In a real scenario, send bytes to a thermal printer
  const htmlPath = path.join(outDir, `ticket-${saleId}.html`);
  fs.writeFileSync(htmlPath, buildTicketHtml(db, saleId), 'utf-8');

  return { ok: true, pdfPath, htmlPath };
}

module.exports = { printTicket };
