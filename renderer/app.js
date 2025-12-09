const productsEl = document.getElementById('products');
const cartEl = document.getElementById('cart');
const totalEl = document.getElementById('total');
const statusEl = document.getElementById('status');
const searchEl = document.getElementById('search');
const categoryEl = document.getElementById('category');
const btnReload = document.getElementById('btnReload');
const btnCheckout = document.getElementById('btnCheckout');
const btnClear = document.getElementById('btnClear');
const btnPrint = document.getElementById('btnPrint');
// Login elements
const loginOverlay = document.getElementById('login');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const btnLogin = document.getElementById('btnLogin');
const loginStatus = document.getElementById('loginStatus');

let lastSaleId = null;
let products = [];
let categories = [];
let cart = new Map(); // id -> { id, name, price, qty }

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
      const item = cart.get(id); if (!item) return; updateQty(id, item.qty + 1);
    });
  });
  cartEl.querySelectorAll('button[data-dec]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-dec'));
      const item = cart.get(id); if (!item) return; updateQty(id, Math.max(1, item.qty - 1));
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

// Events
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
  btnPrint.disabled = false;
  statusEl.textContent = `Vente #${saleId} créée.`;
  clearCart();
});

btnPrint.addEventListener('click', async () => {
  if (!lastSaleId) { statusEl.textContent = 'Aucun ticket à imprimer.'; return; }
  const res = await window.api.invoke('printer:printTicket', lastSaleId);
  statusEl.textContent = res.ok ? `PDF: ${res.pdfPath}` : `Erreur: ${res.error}`;
});

// Initial load
window.addEventListener('DOMContentLoaded', () => {
  ensureSession().then(() => loadCategories().then(loadProducts));
});

async function ensureSession() {
  const res = await window.api.invoke('auth:getSession');
  if (res?.user) {
    hideLogin();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginOverlay.classList.remove('hidden');
  loginOverlay.setAttribute('aria-hidden', 'false');
  loginUser.focus();
}
function hideLogin() {
  loginOverlay.classList.add('hidden');
  loginOverlay.setAttribute('aria-hidden', 'true');
}

btnLogin?.addEventListener('click', doLogin);
loginPass?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  loginStatus.textContent = 'Connexion...';
  const username = (loginUser.value||'').trim();
  const password = loginPass.value||'';
  const res = await window.api.invoke('auth:login', { username, password });
  if (!res?.ok) {
    loginStatus.textContent = res?.error || 'Échec de connexion';
    return;
  }
  loginStatus.textContent = '';
  const role = res.user?.role;
  if (role === 'admin') {
    window.location = 'admin.html';
    return;
  }
  hideLogin();
  // Reload data for session-based UI if needed (cashier)
  loadCategories().then(loadProducts);
}
