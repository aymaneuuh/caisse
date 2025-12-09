const productsEl = document.getElementById('products');
const cartEl = document.getElementById('cart');
const totalEl = document.getElementById('total');
const statusEl = document.getElementById('status');
const searchEl = document.getElementById('search');
const categoryEl = document.getElementById('category');
const btnReload = document.getElementById('btnReload');
const btnCheckout = document.getElementById('btnCheckout');
const btnClear = document.getElementById('btnClear');
const btnLogout = document.getElementById('btnLogout');

let lastSaleId = null;
let products = [];
let categories = [];
let cart = new Map();

function formatPrice(n) { return `${Number(n).toFixed(2)}€`; }

function renderProducts(list) {
  productsEl.innerHTML = list.map(p => `
    <li>
      <div>
        <div>${p.name}</div>
        <div class="meta">${formatPrice(p.price)} ${p.category ? `· ${p.category}` : ''}</div>
      </div>
      <button data-add="${p.id}" class="primary">Ajouter</button>
    </li>
  `).join('');

  productsEl.querySelectorAll('button[data-add]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-add'));
      const prod = products.find(x => x.id === id);
      addToCart(prod);
    });
  });
}

function renderCart() {
  const items = Array.from(cart.values());
  cartEl.innerHTML = items.map(i => `
    <li>
      <div>${i.name}</div>
      <div class="qty-group">
        <button class="icon" data-dec="${i.id}">-</button>
        <input class="qty" data-qty="${i.id}" type="number" min="1" value="${i.qty}" />
        <button class="icon" data-inc="${i.id}">+</button>
      </div>
      <div>${formatPrice(i.price)}</div>
      <div>${formatPrice(i.price * i.qty)}</div>
      <button class="icon" data-remove="${i.id}">✕</button>
    </li>
  `).join('');

  let total = items.reduce((s, x) => s + x.price * x.qty, 0);
  totalEl.textContent = formatPrice(total);
  btnCheckout.disabled = items.length === 0;

  cartEl.querySelectorAll('input[data-qty]').forEach(input => {
    input.addEventListener('change', () => {
      const id = Number(input.getAttribute('data-qty'));
      const v = Math.max(1, Number(input.value || 1));
      updateQty(id, v);
    });
  });
  cartEl.querySelectorAll('button[data-inc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-inc'));
      const item = cart.get(id);
      if (!item) return;
      updateQty(id, item.qty + 1);
    });
  });
  cartEl.querySelectorAll('button[data-dec]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-dec'));
      const item = cart.get(id);
      if (!item) return;
      updateQty(id, Math.max(1, item.qty - 1));
    });
  });
  cartEl.querySelectorAll('button[data-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-remove'));
      removeFromCart(id);
    });
  });
}

function addToCart(p) {
  const item = cart.get(p.id) || { id: p.id, name: p.name, price: Number(p.price), qty: 0 };
  item.qty += 1;
  cart.set(p.id, item);
  renderCart();
}

function updateQty(id, qty) {
  const item = cart.get(id);
  if (!item) return;
  item.qty = qty;
  cart.set(id, item);
  renderCart();
}

function removeFromCart(id) {
  cart.delete(id);
  renderCart();
}

function clearCart() {
  cart.clear();
  renderCart();
}

async function loadProducts() {
  statusEl.textContent = 'Chargement...';
  products = await window.api.invoke('products:getAll');
  statusEl.textContent = `Chargé ${products.length} produits.`;
  applyFilter();
}

async function loadCategories() {
  categories = await window.api.invoke('categories:getAll');
  categoryEl.innerHTML = `<option value="">Toutes catégories</option>` +
    categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function applyFilter() {
  const q = (searchEl.value || '').toLowerCase().trim();
  const cat = categoryEl.value;
  let list = products;
  if (cat) list = list.filter(p => String(p.category_id||'') === String(cat));
  if (q) list = list.filter(p => `${p.name} ${p.category||''}`.toLowerCase().includes(q));
  renderProducts(list);
}

// Event listeners
btnReload.addEventListener('click', loadProducts);
searchEl.addEventListener('input', applyFilter);
categoryEl.addEventListener('change', applyFilter);
btnClear.addEventListener('click', clearCart);

btnCheckout.addEventListener('click', async () => {
  const items = Array.from(cart.values()).map(i => ({ product_id: i.id, quantity: i.qty }));
  if (items.length === 0) return;
  statusEl.textContent = 'Encaissement...';
  const { ok, saleId, error } = await window.api.invoke('sales:create', { items, cashier_id: 1 });
  if (!ok) { statusEl.textContent = `Erreur: ${error||'vente'}`; return; }
  lastSaleId = saleId;
  statusEl.textContent = `Vente #${saleId} créée.`;
  clearCart();
});

btnLogout.addEventListener('click', async () => {
  await window.api.invoke('auth:logout');
  window.location = 'login.html';
});

// Session guard and initial load
window.addEventListener('DOMContentLoaded', async () => {
  const res = await window.api.invoke('auth:getSession');
  const user = res?.user;
  if (!user) {
    window.location = 'login.html';
    return;
  }
  if (user.role === 'admin') {
    window.location = 'admin.html';
    return;
  }
  await loadCategories();
  await loadProducts();
  statusEl.textContent = '';
});
