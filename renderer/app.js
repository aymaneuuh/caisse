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
const checkoutModal = document.getElementById('checkoutModal');
const payTotalEl = document.getElementById('payTotal');
const cashInput = document.getElementById('cashInput');
const changeValue = document.getElementById('changeValue');
const btnCancelPay = document.getElementById('btnCancelPay');
const btnConfirmPay = document.getElementById('btnConfirmPay');
const paymentMethod = document.getElementById('paymentMethod');
const cashArea = document.getElementById('cashArea');
const quickCashButtons = document.querySelectorAll('button[data-cash]');

let lastSaleId = null;
let products = [];
let categories = [];
let cart = new Map();
let cashierId = null;
let currentTotal = 0;

function formatPrice(n) { return `${Number(n).toFixed(2)}€`; }

function renderProducts(list) {
  productsEl.innerHTML = list.map(p => `
    <li>
      <div>
        <div>${p.name}</div>
        <div class="price">${formatPrice(p.price)}</div>
        <div class="meta">${p.category || 'Catégorie'}</div>
      </div>
      <button data-add="${p.id}" class="primary">+ Ajouter</button>
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
      <div>
        <div class="item-name">${i.name}</div>
        <div class="item-price">${formatPrice(i.price)} × ${i.qty}</div>
      </div>
      <div class="qty-group">
        <button class="icon" data-dec="${i.id}">−</button>
        <input class="qty" data-qty="${i.id}" type="number" min="1" value="${i.qty}" />
        <button class="icon" data-inc="${i.id}">+</button>
      </div>
      <div style="font-weight: 700; color: var(--primary); text-align: right;">${formatPrice(i.price * i.qty)}</div>
      <button class="icon danger" data-remove="${i.id}" style="background: linear-gradient(135deg, #ef4444, #dc2626); min-width: 44px;">✕</button>
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

function openCheckoutModal(total) {
  currentTotal = total;
  payTotalEl.textContent = formatPrice(total);
  paymentMethod.value = 'cash';
  cashArea.style.display = 'block';
  cashInput.value = Number(total).toFixed(2);
  updateChange();
  updatePaymentUI();
  checkoutModal.style.display = 'flex';
}

function closeCheckoutModal() {
  checkoutModal.style.display = 'none';
}

function updateChange() {
  const cash = Number(cashInput.value || 0);
  const change = Math.max(0, cash - currentTotal);
  changeValue.textContent = formatPrice(change);
}

function updatePaymentUI() {
  const isCash = paymentMethod.value === 'cash';
  cashArea.style.display = isCash ? 'block' : 'none';
  if (!isCash) {
    changeValue.textContent = formatPrice(0);
  }
  btnConfirmPay.textContent = isCash ? 'Encaisser (Espèces)' : 'Encaisser (Carte)';
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

btnCheckout.addEventListener('click', () => {
  const items = Array.from(cart.values());
  if (!items.length) return;
  const total = items.reduce((s, x) => s + x.price * x.qty, 0);
  openCheckoutModal(total);
});

paymentMethod.addEventListener('change', () => {
  updatePaymentUI();
  if (paymentMethod.value === 'cash') updateChange();
});

cashInput.addEventListener('input', updateChange);

quickCashButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    if (paymentMethod.value !== 'cash') return;
    const val = btn.getAttribute('data-cash');
    if (val === 'exact') {
      cashInput.value = Number(currentTotal).toFixed(2);
    } else {
      const increment = Number(val.replace('+', ''));
      const current = Number(cashInput.value || 0);
      cashInput.value = (current + increment).toFixed(2);
    }
    updateChange();
  });
});

btnCancelPay.addEventListener('click', closeCheckoutModal);

btnConfirmPay.addEventListener('click', async () => {
  const items = Array.from(cart.values()).map(i => ({ product_id: i.id, quantity: i.qty }));
  if (!items.length) return;

  const method = paymentMethod.value;
  const cashReceived = Number(cashInput.value || 0);
  if (method === 'cash' && cashReceived < currentTotal) {
    statusEl.textContent = 'Montant insuffisant pour encaisser.';
    return;
  }

  statusEl.textContent = 'Encaissement...';
  const payload = {
    items,
    cashier_id: cashierId || 1,
    payment_method: method,
    cash_received: method === 'cash' ? cashReceived : null,
    change: method === 'cash' ? Math.max(0, cashReceived - currentTotal) : 0,
  };

  const { ok, saleId, error } = await window.api.invoke('sales:create', payload);
  if (!ok) { statusEl.textContent = `Erreur: ${error||'vente'}`; return; }
  lastSaleId = saleId;
  statusEl.textContent = `Vente #${saleId} créée (${method === 'cash' ? 'Espèces' : 'Carte'}).`;
  
  // Print ticket
  statusEl.textContent = 'Impression du ticket...';
  const printRes = await window.api.invoke('printer:printTicket', saleId);
  if (printRes?.ok) {
    statusEl.textContent = `Ticket #${saleId} imprimé.`;
  } else {
    statusEl.textContent = `Vente créée mais erreur d'impression: ${printRes?.error || 'inconnue'}`;
  }
  
  clearCart();
  closeCheckoutModal();
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
  cashierId = user.id;
  await loadCategories();
  await loadProducts();
  statusEl.textContent = '';
});
