const userBadge = document.getElementById('userBadge');
const btnLogout = document.getElementById('btnLogout');
const goPos = document.getElementById('goPos');

const pName = document.getElementById('pName');
const pPrice = document.getElementById('pPrice');
const pCategory = document.getElementById('pCategory');
const btnAddProduct = document.getElementById('btnAddProduct');
const pStatus = document.getElementById('pStatus');
const productTable = document.getElementById('productTable').querySelector('tbody');

const fromDate = document.getElementById('fromDate');
const toDate = document.getElementById('toDate');
const btnLoadSales = document.getElementById('btnLoadSales');
const sStatus = document.getElementById('sStatus');
const salesTable = document.getElementById('salesTable').querySelector('tbody');

function formatPrice(n) { return `${Number(n).toFixed(2)}€`; }

async function ensureAdminSession() {
  const res = await window.api.invoke('auth:getSession');
  if (!res?.user) {
    window.location = 'index.html';
    return false;
  }
  userBadge.textContent = `${res.user.username} (${res.user.role})`;
  if (res.user.role !== 'admin') {
    // Redirect non-admin to POS
    window.location = 'index.html';
    return false;
  }
  return true;
}

async function loadCategories() {
  const cats = await window.api.invoke('categories:getAll');
  pCategory.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function loadProducts() {
  const items = await window.api.invoke('products:getAll');
  productTable.innerHTML = items.map(p => `
    <tr data-id="${p.id}">
      <td><input data-edit-name value="${p.name}"/></td>
      <td><input data-edit-price type="number" min="0" step="0.01" value="${Number(p.price).toFixed(2)}"/></td>
      <td>${p.category || ''}</td>
      <td>
        <button data-save>Enregistrer</button>
        <button data-delete>Supprimer</button>
      </td>
    </tr>
  `).join('');

  productTable.querySelectorAll('button[data-save]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const id = Number(tr.getAttribute('data-id'));
      const name = tr.querySelector('[data-edit-name]').value.trim();
      const price = Number(tr.querySelector('[data-edit-price]').value);
      await window.api.invoke('products:update', { id, name, price, category_id: null });
      pStatus.textContent = 'Produit mis à jour.';
      loadProducts();
    });
  });
  productTable.querySelectorAll('button[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const id = Number(tr.getAttribute('data-id'));
      await window.api.invoke('products:delete', id);
      pStatus.textContent = 'Produit supprimé.';
      loadProducts();
    });
  });
}

btnAddProduct.addEventListener('click', async () => {
  const name = pName.value.trim();
  const price = Number(pPrice.value);
  const category_id = pCategory.value ? Number(pCategory.value) : null;
  if (!name || !(price >= 0)) { pStatus.textContent = 'Nom/prix invalides'; return; }
  await window.api.invoke('products:add', { name, price, category_id });
  pStatus.textContent = 'Produit ajouté.';
  pName.value = ''; pPrice.value = '';
  loadProducts();
});

btnLogout.addEventListener('click', async () => {
  await window.api.invoke('auth:logout');
  window.location = 'index.html';
});

goPos.addEventListener('click', () => {
  window.location = 'index.html';
});

function todayStr(d) {
  return d.toISOString().slice(0,10);
}

async function loadSales() {
  const from = fromDate.value || todayStr(new Date());
  const to = toDate.value || todayStr(new Date());
  const list = await window.api.invoke('sales:getByDate', { from, to });
  salesTable.innerHTML = list.map(s => `
    <tr data-id="${s.id}">
      <td>#${s.id}</td>
      <td>${formatPrice(s.total)}</td>
      <td>${s.created_at.replace('T',' ').slice(0,16)}</td>
      <td>${s.cashier_id}</td>
      <td><button data-cancel>Annuler</button></td>
    </tr>
  `).join('');
  salesTable.querySelectorAll('button[data-cancel]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const saleId = Number(tr.getAttribute('data-id'));
      const sess = await window.api.invoke('auth:getSession');
      const admin_id = sess?.user?.id;
      const res = await window.api.invoke('sales:cancel', { saleId, admin_id });
      if (res?.ok) { sStatus.textContent = 'Vente annulée.'; loadSales(); }
      else { sStatus.textContent = res?.error || 'Échec annulation'; }
    });
  });
}

btnLoadSales.addEventListener('click', loadSales);

window.addEventListener('DOMContentLoaded', async () => {
  if (!(await ensureAdminSession())) return;
  await loadCategories();
  await loadProducts();
  const t = todayStr(new Date()); fromDate.value = t; toDate.value = t; await loadSales();
});
