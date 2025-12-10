const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const dayjs = require('dayjs');

async function printTicket(db, saleId) {
  const outDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const timestamp = dayjs().format('YYYYMMDD-HHmmss');
  const pdfPath = path.join(outDir, `ticket-${saleId}_${timestamp}.pdf`);

  const sale = db.get('SELECT * FROM sales WHERE id=?', [saleId]);
  if (!sale) return { ok: false, error: 'Sale not found' };

  const items = db.all(`
      SELECT si.quantity, si.price, si.note, p.name 
      FROM sale_items si 
      JOIN products p ON p.id = si.product_id 
      WHERE si.sale_id=?`,
    [saleId]
  );

  const cashier = db.get(
    'SELECT username FROM users WHERE id=?',
    [sale.cashier_id]
  );

  // Calcul précis de la hauteur
  const HEADER_HEIGHT = 120;
  const TABLE_HEADER_HEIGHT = 35;
  const LINE_HEIGHT = 14;
  const NOTE_HEIGHT = 10;
  const FOOTER_HEIGHT = 80;
  
  // Calcul du nombre de lignes avec notes
  let totalLines = items.length;
  items.forEach(i => {
    if (i.note && i.note.trim()) totalLines += 1;
  });
  
  const itemsHeight = (items.length * LINE_HEIGHT) + 
                      (items.filter(i => i.note && i.note.trim()).length * NOTE_HEIGHT);
  
  const pageHeight = HEADER_HEIGHT + TABLE_HEADER_HEIGHT + itemsHeight + FOOTER_HEIGHT;
  const pageWidth = 170;

  const doc = new PDFDocument({
    size: [pageWidth, pageHeight],
    margin: 0,
    bufferPages: true,
    autoFirstPage: false
  });

  doc.pipe(fs.createWriteStream(pdfPath));
  
  doc.addPage({ 
    size: [pageWidth, pageHeight], 
    margin: 0 
  });

  const MX = 8; // Marge X
  const W = pageWidth - (MX * 2);
  let y = 12; // Position Y manuelle

  // ========== HEADER ==========
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text("CAISSE SNACK", MX, y, { width: W, align: "center" });
  y += 15;

  doc.font('Helvetica').fontSize(6.5);
  doc.text("Restaurant & Snack Bar", MX, y, { width: W, align: "center" });
  y += 9;
  doc.text("123 Rue de la Gare", MX, y, { width: W, align: "center" });
  y += 8;
  doc.text("75001 Paris, France", MX, y, { width: W, align: "center" });
  y += 8;
  doc.text("Tél: 01 23 45 67 89", MX, y, { width: W, align: "center" });
  y += 8;
  doc.text("SIRET: 123 456 789 00010", MX, y, { width: W, align: "center" });
  y += 12;

  drawSeparator(doc, y, pageWidth);
  y += 10;

  // ========== TICKET INFO ==========
  const ticketNum = saleId.toString().padStart(3, '0');
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text(`TICKET N° ${ticketNum}`, MX, y, { width: W, align: "center" });
  y += 12;

  doc.font("Helvetica").fontSize(7);
  doc.text(dayjs(sale.created_at).format("DD/MM/YYYY à HH:mm"), MX, y, { width: W, align: "center" });
  y += 9;
  doc.text(`Caissier: ${cashier?.username || "N/A"}`, MX, y, { width: W, align: "center" });
  y += 10; // Saut de ligne après caissier
  y += 12;

  drawSeparator(doc, y, pageWidth);
  y += 10;

  // ========== TABLE HEADER ==========
  doc.fontSize(7).font("Helvetica-Bold");
  doc.text("QTÉ", 12, y, { width: 20, align: "left" });
  doc.text("ARTICLE", 32, y, { width: 65, align: "left" });
  doc.text("P.U", 97, y, { width: 28, align: "right" });
  doc.text("TOTAL", 125, y, { width: 28, align: "right" });
  y += 12;

  drawSeparator(doc, y, pageWidth);
  y += 9;

  // ========== ITEMS ==========
  doc.font("Helvetica").fontSize(7);

  items.forEach(i => {
    // Ligne principale
    doc.text(i.quantity.toString(), 12, y, { width: 20, align: "left" });
    
    let name = i.name;
    if (name.length > 16) name = name.substring(0, 16) + "..";
    doc.text(name, 32, y, { width: 65, align: "left" });
    
    doc.text(i.price.toFixed(2) + "€", 97, y, { width: 28, align: "right" });
    doc.text((i.price * i.quantity).toFixed(2) + "€", 125, y, { width: 28, align: "right" });
    
    y += LINE_HEIGHT;
    
    // Note si elle existe
    if (i.note && i.note.trim()) {
      doc.fontSize(6).fillColor('#666666');
      doc.text(`  📝 ${i.note}`, 32, y, { width: 121, align: "left" });
      doc.fillColor('#000000').fontSize(7);
      y += NOTE_HEIGHT;
    }
  });

  y += 6;
  drawSeparator(doc, y, pageWidth);
  y += 12;

  // ========== TOTAL ==========
  doc.font("Helvetica-Bold").fontSize(13);
  doc.text(`TOTAL: ${sale.total.toFixed(2)} €`, MX, y, { 
    width: W, 
    align: "center" 
  });
  y += 22;

  drawSeparator(doc, y, pageWidth);
  y += 10;

  // ========== FOOTER ==========
  doc.font("Helvetica").fontSize(7);
  doc.text("Merci de votre visite !", MX, y, { width: W, align: "center" });
  y += 10;
  doc.text("À bientôt", MX, y, { width: W, align: "center" });
  y += 12;

  doc.fontSize(6);
  doc.text("TVA non applicable, art. 293 B du CGI", MX, y, { width: W, align: "center" });

  doc.end();

  return { ok: true, pdfPath };
}

function drawSeparator(doc, y, pageWidth) {
  doc.fontSize(7).font("Helvetica")
     .text("- - - - - - - - - - - - - - - - - -", 0, y, { 
       width: pageWidth, 
       align: "center" 
     });
}

module.exports = { printTicket };