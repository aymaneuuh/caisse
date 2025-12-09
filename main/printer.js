const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const dayjs = require('dayjs');

async function printTicket(db, saleId) {
  const outDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const pdfPath = path.join(outDir, `ticket-${saleId}.pdf`);

  const sale = db.get('SELECT * FROM sales WHERE id=?', [saleId]);
  if (!sale) return { ok: false, error: 'Sale not found' };

  const items = db.all(`
      SELECT si.quantity, si.price, p.name 
      FROM sale_items si 
      JOIN products p ON p.id = si.product_id 
      WHERE si.sale_id=?`,
    [saleId]
  );

  const cashier = db.get(
    'SELECT username FROM users WHERE id=?',
    [sale.cashier_id]
  );

  // Height auto : header + items + footer
  const baseHeight = 220;
  const perItem = 22;
  const pageHeight = baseHeight + perItem * items.length;

  const doc = new PDFDocument({
    margin: 10,
    size: [165, pageHeight] // 58mm printer
  });

  doc.pipe(fs.createWriteStream(pdfPath));

  // ---------- HEADER ----------
  doc.fontSize(12).font('Helvetica-Bold').text("CAISSE SNACK", { align: "center" });
  doc.fontSize(7).font('Helvetica').text("Restaurant & Snack Bar", { align: "center" });
  doc.text("123 Rue de la Gare", { align: "center" });
  doc.text("75001 Paris, France", { align: "center" });
  doc.text("Tél: 01 23 45 67 89", { align: "center" });
  doc.text("SIRET: 123 456 789 00010", { align: "center" });

  separator(doc);

  // ---------- TICKET INFO ----------
  doc.font("Helvetica-Bold").fontSize(8).text(`TICKET N° ${saleId}`, { align: "center" });
  doc.font("Helvetica").fontSize(7).text(
    dayjs(sale.created_at).format("DD/MM/YYYY à HH:mm"),
    { align: "center" }
  );
  doc.text(`Caissier: ${cashier?.username || "N/A"}`, { align: "center" });

  separator(doc);

  // ---------- TABLE HEADER ----------
  doc.fontSize(7).font("Helvetica-Bold");
  const startY = doc.y;
  doc.text("QTÉ", 12, startY, { width: 20, align: "left" });
  doc.text("ARTICLE", 32, startY, { width: 65, align: "left" });
  doc.text("P.U.", 97, startY, { width: 28, align: "right" });
  doc.text("TOTAL", 125, startY, { width: 28, align: "right" });
  doc.moveDown();

  separator(doc);

  // ---------- ITEMS ----------
  doc.font("Helvetica").fontSize(7);

  items.forEach(i => {
    const y = doc.y;
    doc.text(i.quantity.toString(), 12, y, { width: 20, align: "left" });
    doc.text(i.name, 32, y, { width: 65, align: "left" });
    doc.text(i.price.toFixed(2) + "€", 97, y, { width: 28, align: "right" });
    doc.text((i.price * i.quantity).toFixed(2) + "€", 125, y, { width: 28, align: "right" });
    doc.moveDown(0.6);
  });

  separator(doc);

  // ---------- TOTAL ----------
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text(`TOTAL : ${sale.total.toFixed(2)} €`, {
    align: "right"
  });

  separator(doc);

  // ---------- FOOTER ----------
  doc.font("Helvetica").fontSize(7).text("Merci de votre visite !", { align: "center" });
  doc.text("À bientôt", { align: "center" });
  doc.moveDown(0.3);

  doc.fontSize(6).text("TVA non applicable, art. 293 B du CGI", { align: "center" });

  doc.end();

  return { ok: true, pdfPath };
}

// ---------- SMALL SEPARATOR ----------
function separator(doc) {
  doc.moveDown(0.3);
  doc.fontSize(7).text("-".repeat(28), { align: "center" });
  doc.moveDown(0.3);
}

module.exports = { printTicket };
