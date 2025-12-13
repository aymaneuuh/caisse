const productsEl = document.getElementById('products');
const cartEl = document.getElementById('cart');
const totalEl = document.getElementById('total');
const statusEl = document.getElementById('status');
const searchEl = document.getElementById('search');
const categoryGrid = document.getElementById('categoryGrid');
const btnReload = document.getElementById('btnReload');
const btnCheckout = document.getElementById('btnCheckout');
const btnClear = document.getElementById('btnClear');
const btnLogout = document.getElementById('btnLogout');
const checkoutModal = document.getElementById('checkoutModal');
const paymentMethodStep = document.getElementById('paymentMethodStep');
const cashPaymentStep = document.getElementById('cashPaymentStep');
const payTotalEl = document.getElementById('payTotal');
const cashPayTotalEl = document.getElementById('cashPayTotal');
const btnPayCash = document.getElementById('btnPayCash');
const btnPayCard = document.getElementById('btnPayCard');
const cashInput = document.getElementById('cashInput');
const changeValue = document.getElementById('changeValue');
const btnCancelPay = document.getElementById('btnCancelPay');
const btnConfirmPay = document.getElementById('btnConfirmPay');
const quickCashButtons = document.querySelectorAll('button[data-cash]');

// Note Modal
const noteModal = document.getElementById('noteModal');
const noteInput = document.getElementById('noteInput');
const btnCancelNote = document.getElementById('btnCancelNote');
const btnSaveNote = document.getElementById('btnSaveNote');

// Supplements Modal
const supplementsModal = document.getElementById('supplementsModal');
const supplementsList = document.getElementById('supplementsList');
const btnCancelSupplements = document.getElementById('btnCancelSupplements');

let lastSaleId = null;
let products = [];
let currentNoteItemId = null;
let currentSupplementsItemId = null;
let categories = [];
let cart = new Map();
let cashierId = null;
let currentTotal = 0;
let selectedCategoryId = null;
let selectedPaymentMethod = null;

function formatPrice(n) { return `${Number(n).toFixed(2)}€`; }

function renderProducts(list) {
  productsEl.innerHTML = list.map(p => `
    <li data-add="${p.id}" style="cursor: pointer;">
      <div>
        <div>${p.name}</div>
        <div class="price">${formatPrice(p.price)}</div>
        <div class="meta">${p.category || 'Catégorie'}</div>
      </div>
    </li>
  `).join('');

  productsEl.querySelectorAll('li[data-add]').forEach(li => {
    li.addEventListener('click', () => {
      const id = Number(li.getAttribute('data-add'));
      const prod = products.find(x => x.id === id);
      addToCart(prod);
    });
  });
}

function renderCategoryButtons() {
  const allBtn = `<button class="category-btn ${selectedCategoryId === null ? 'active' : ''}" data-category="">Tout</button>`;
  const categoryBtns = categories.map(cat => `
    <button class="category-btn ${selectedCategoryId === cat.id ? 'active' : ''}" data-category="${cat.id}">${cat.name}</button>
  `).join('');
  
  categoryGrid.innerHTML = allBtn + categoryBtns;
  
  categoryGrid.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.getAttribute('data-category');
      selectedCategoryId = catId ? Number(catId) : null;
      renderCategoryButtons();
      applyFilter();
    });
  });
}

function renderCart() {
  const items = Array.from(cart.values());
  cartEl.innerHTML = items.map(i => {
    const supTotal = (i.supplements || []).reduce((s, sup) => s + sup.price * sup.qty, 0);
    const itemTotal = (i.price + supTotal) * i.qty;
    return `
    <li data-item-id="${i.id}">
      <div style="grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: start;">
        <div>
          <div class="item-name">${i.name}</div>
          <div class="item-price">${formatPrice(i.price)} × ${i.qty}</div>
          ${i.note ? `<div style="font-size: 12px; color: var(--warning); margin-top: 4px; font-style: italic;">📝 ${i.note}</div>` : ''}
          ${(i.supplements || []).length > 0 ? `
            <div style="font-size: 12px; color: var(--success); margin-top: 6px;">
              ${i.supplements.map(s => `+ ${s.name} (${formatPrice(s.price)} × ${s.qty})`).join('<br>')}
            </div>
          ` : ''}
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="icon warning" data-note="${i.id}" style="min-width: 36px; min-height: 36px; font-size: 14px; padding: 6px;" title="Ajouter note">📝</button>
          <button class="icon success" data-supp="${i.id}" style="min-width: 36px; min-height: 36px; font-size: 16px; padding: 6px;" title="Ajouter suppléments">+</button>
        </div>
      </div>
      <div class="qty-group">
        <button class="icon" data-dec="${i.id}">-</button>
        <input class="qty" data-qty="${i.id}" type="number" min="1" value="${i.qty}" />
        <button class="icon" data-inc="${i.id}">+</button>
      </div>
      <div style="font-weight: 800; color: var(--success); text-align: right; font-size: 17px;">${formatPrice(itemTotal)}</div>
      <button class="icon danger" data-remove="${i.id}" style="background: linear-gradient(135deg, #ef4444, #dc2626); min-width: 44px; font-size: 20px;">×</button>
    </li>
  `}).join('');

  let total = items.reduce((s, x) => {
    const supTotal = (x.supplements || []).reduce((sum, sup) => sum + sup.price * sup.qty, 0);
    return s + (x.price + supTotal) * x.qty;
  }, 0);
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
  cartEl.querySelectorAll('button[data-note]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-note'));
      openNoteModal(id);
    });
  });
  cartEl.querySelectorAll('button[data-supp]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = Number(btn.getAttribute('data-supp'));
      openSupplementsModal(id);
    });
  });
}

function addToCart(p) {
  const item = cart.get(p.id) || { id: p.id, name: p.name, price: Number(p.price), qty: 0, note: '', supplements: [] };
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
  selectedPaymentMethod = null;
  payTotalEl.textContent = formatPrice(total);
  
  // Show step 1 (choose payment method), hide step 2
  paymentMethodStep.style.display = 'block';
  cashPaymentStep.style.display = 'none';
  
  // Reset buttons
  btnPayCash.classList.remove('btn-selected');
  btnPayCard.classList.remove('btn-selected');
  btnConfirmPay.textContent = 'Valider';
  btnConfirmPay.disabled = false;
  
  checkoutModal.style.display = 'flex';
}

function closeCheckoutModal() {
  checkoutModal.style.display = 'none';
}

function selectPaymentMethod(method) {
  selectedPaymentMethod = method;
  
  if (method === 'cash') {
    // Show cash payment step
    cashPayTotalEl.textContent = formatPrice(currentTotal);
    cashInput.value = Number(currentTotal).toFixed(2);
    updateChange();
    cashPaymentStep.style.display = 'block';
    paymentMethodStep.style.display = 'none';
    btnConfirmPay.textContent = 'Encaisser';
    btnConfirmPay.disabled = false;
    // Focus on cash input for quick entry
    setTimeout(() => cashInput.focus(), 100);
  } else {
    // Card payment - go straight to confirm
    cashPaymentStep.style.display = 'none';
    paymentMethodStep.style.display = 'none';
    btnConfirmPay.textContent = 'Encaisser';
    btnConfirmPay.disabled = false;
  }
}

function goBackToPaymentMethod() {
  selectedPaymentMethod = null;
  paymentMethodStep.style.display = 'block';
  cashPaymentStep.style.display = 'none';
}

function updateChange() {
  const cash = Number(cashInput.value || 0);
  const change = Math.max(0, cash - currentTotal);
  changeValue.textContent = formatPrice(change);
}

function openNoteModal(itemId) {
  currentNoteItemId = itemId;
  const item = cart.get(itemId);
  if (!item) return;
  noteInput.value = item.note || '';
  noteModal.style.display = 'flex';
  setTimeout(() => noteInput.focus(), 100);
}

function closeNoteModal() {
  noteModal.style.display = 'none';
  currentNoteItemId = null;
}

function saveNote() {
  if (currentNoteItemId === null) return;
  const item = cart.get(currentNoteItemId);
  if (!item) return;
  item.note = noteInput.value.trim();
  cart.set(currentNoteItemId, item);
  renderCart();
  closeNoteModal();
}

async function openSupplementsModal(itemId) {
  currentSupplementsItemId = itemId;
  const item = cart.get(itemId);
  if (!item) return;
  
  // Load supplements (category 4)
  const supplements = products.filter(p => p.category_id === 4);
  
  supplementsList.innerHTML = supplements.map(sup => {
    const existing = (item.supplements || []).find(s => s.id === sup.id);
    const qty = existing ? existing.qty : 0;
    return `
      <div style="background: linear-gradient(145deg, #fff 0%, #f8fafc 100%); border: 2px solid var(--border); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
        <div>
          <div style="font-weight: 700; font-size: 14px; color: var(--fg);">${sup.name}</div>
          <div style="font-weight: 800; font-size: 16px; color: var(--success); margin-top: 4px;">${formatPrice(sup.price)}</div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button class="icon danger" data-sup-dec="${sup.id}" style="flex: 1; min-height: 48px; font-size: 20px;">−</button>
          <input type="number" data-sup-qty="${sup.id}" value="${qty}" min="0" readonly style="width: 60px; text-align: center; font-weight: 800; font-size: 18px; border: 2px solid var(--border); border-radius: 8px; padding: 8px;" />
          <button class="icon success" data-sup-inc="${sup.id}" style="flex: 1; min-height: 48px; font-size: 20px;">+</button>
        </div>
      </div>
    `;
  }).join('');
  
  supplementsModal.style.display = 'flex';
  
  // Event listeners
  supplementsList.querySelectorAll('button[data-sup-inc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const supId = Number(btn.getAttribute('data-sup-inc'));
      addSupplement(itemId, supId);
    });
  });
  
  supplementsList.querySelectorAll('button[data-sup-dec]').forEach(btn => {
    btn.addEventListener('click', () => {
      const supId = Number(btn.getAttribute('data-sup-dec'));
      removeSupplement(itemId, supId);
    });
  });
}

function closeSupplementsModal() {
  supplementsModal.style.display = 'none';
  currentSupplementsItemId = null;
}

function addSupplement(itemId, supId) {
  const item = cart.get(itemId);
  if (!item) return;
  if (!item.supplements) item.supplements = [];
  
  const sup = products.find(p => p.id === supId);
  if (!sup) return;
  
  const existing = item.supplements.find(s => s.id === supId);
  if (existing) {
    existing.qty += 1;
  } else {
    item.supplements.push({ id: sup.id, name: sup.name, price: Number(sup.price), qty: 1 });
  }
  
  cart.set(itemId, item);
  renderCart();
  openSupplementsModal(itemId); // Refresh modal
}

function removeSupplement(itemId, supId) {
  const item = cart.get(itemId);
  if (!item || !item.supplements) return;
  
  const existing = item.supplements.find(s => s.id === supId);
  if (!existing) return;
  
  existing.qty -= 1;
  if (existing.qty <= 0) {
    item.supplements = item.supplements.filter(s => s.id !== supId);
  }
  
  cart.set(itemId, item);
  renderCart();
  openSupplementsModal(itemId); // Refresh modal
}

async function loadProducts() {
  statusEl.textContent = 'Chargement...';
  products = await window.api.invoke('products:getAll');
  statusEl.textContent = `Chargé ${products.length} produits.`;
  applyFilter();
}

async function loadCategories() {
  categories = await window.api.invoke('categories:getAll');
  renderCategoryButtons();
}

function applyFilter() {
  const q = (searchEl.value || '').toLowerCase().trim();
  let list = products;
  if (selectedCategoryId) list = list.filter(p => p.category_id === selectedCategoryId);
  if (q) list = list.filter(p => `${p.name} ${p.category||''}`.toLowerCase().includes(q));
  renderProducts(list);
}

// Event listeners
btnReload.addEventListener('click', loadProducts);
searchEl.addEventListener('input', applyFilter);
btnClear.addEventListener('click', clearCart);

btnCheckout.addEventListener('click', () => {
  const items = Array.from(cart.values());
  if (!items.length) return;
  const total = items.reduce((s, x) => s + x.price * x.qty, 0);
  openCheckoutModal(total);
});

// Payment method buttons
btnPayCash.addEventListener('click', () => selectPaymentMethod('cash'));
btnPayCard.addEventListener('click', () => selectPaymentMethod('card'));

// Cash input
cashInput.addEventListener('input', updateChange);

// Quick cash buttons
quickCashButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    if (selectedPaymentMethod !== 'cash') return;
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

// Cancel and back buttons
btnCancelPay.addEventListener('click', () => {
  if (selectedPaymentMethod === 'cash' && cashPaymentStep.style.display !== 'none') {
    goBackToPaymentMethod();
  } else {
    closeCheckoutModal();
  }
});

// Note modal listeners
btnCancelNote.addEventListener('click', closeNoteModal);
btnSaveNote.addEventListener('click', saveNote);

// Supplements modal listeners
btnCancelSupplements.addEventListener('click', closeSupplementsModal);

btnConfirmPay.addEventListener('click', async () => {
  // If still on payment method selection, don't allow confirm
  if (!selectedPaymentMethod) {
    return;
  }

  // If cash payment but amount not entered
  if (selectedPaymentMethod === 'cash') {
    const cashReceived = Number(cashInput.value || 0);
    if (cashReceived < currentTotal) {
      statusEl.textContent = 'Montant insuffisant pour encaisser.';
      return;
    }
  }

  const items = Array.from(cart.values()).map(i => ({ 
    product_id: i.id, 
    quantity: i.qty,
    note: i.note || null,
    supplements: i.supplements || []
  }));
  if (!items.length) return;

  statusEl.textContent = 'Encaissement...';
  
  const cashReceived = selectedPaymentMethod === 'cash' ? Number(cashInput.value || 0) : null;
  const payload = {
    items,
    cashier_id: cashierId || 1,
    payment_method: selectedPaymentMethod,
    cash_received: cashReceived,
    change: selectedPaymentMethod === 'cash' ? Math.max(0, cashReceived - currentTotal) : 0,
  };

  const { ok, saleId, error } = await window.api.invoke('sales:create', payload);
  if (!ok) { statusEl.textContent = `Erreur: ${error||'vente'}`; return; }
  lastSaleId = saleId;
  statusEl.textContent = `Vente #${saleId} créée (${selectedPaymentMethod === 'cash' ? 'Espèces' : 'Carte'}).`;
  
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
