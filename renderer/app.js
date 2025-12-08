const productsEl = document.getElementById('products');
const statusEl = document.getElementById('status');
const btnLoad = document.getElementById('btnLoad');
const btnFakeSale = document.getElementById('btnFakeSale');
const btnPrint = document.getElementById('btnPrint');

let lastSaleId = null;

btnLoad.addEventListener('click', async () => {
  statusEl.textContent = 'Chargement...';
  const products = await window.api.invoke('products:getAll');
  productsEl.innerHTML = products.map(p => `<li>${p.name} — ${p.price.toFixed(2)}€ [${p.category||'-'}]</li>`).join('');
  statusEl.textContent = `Chargé ${products.length} produits.`;
});

btnFakeSale.addEventListener('click', async () => {
  const products = await window.api.invoke('products:getAll');
  const items = products.slice(0, 3).map(p => ({ product_id: p.id, quantity: 1 }));
  const { ok, saleId } = await window.api.invoke('sales:create', { items, cashier_id: 1 });
  if (ok) {
    lastSaleId = saleId;
    statusEl.textContent = `Vente créée: #${saleId}`;
  }
});

btnPrint.addEventListener('click', async () => {
  if (!lastSaleId) {
    statusEl.textContent = 'Créez une vente test d\'abord.';
    return;
  }
  const res = await window.api.invoke('printer:printTicket', lastSaleId);
  statusEl.textContent = res.ok ? `PDF: ${res.pdfPath}` : `Erreur: ${res.error}`;
});
