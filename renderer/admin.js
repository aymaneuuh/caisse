const userBadge = document.getElementById('userBadge');
const btnLogout = document.getElementById('btnLogout');
const goPos = document.getElementById('goPos');

// Settings
const authModeSelect = document.getElementById('authModeSelect');
const btnSaveAuthMode = document.getElementById('btnSaveAuthMode');
const authStatus = document.getElementById('authStatus');

const pName = document.getElementById('pName');
const pPrice = document.getElementById('pPrice');
const pCategory = document.getElementById('pCategory');
const btnAddProduct = document.getElementById('btnAddProduct');
const pStatus = document.getElementById('pStatus');
const productTable = document.getElementById('productTable').querySelector('tbody');

const fromDate = document.getElementById('fromDate');
const toDate = document.getElementById('toDate');
const btnLoadSales = document.getElementById('btnLoadSales');
const btnLoadAllSales = document.getElementById('btnLoadAllSales');
const sStatus = document.getElementById('sStatus');
const salesTable = document.getElementById('salesTable').querySelector('tbody');
// Work session controls
const btnOpenSession = document.getElementById('btnOpenSession');
const btnCloseSession = document.getElementById('btnCloseSession');
const sessionInfo = document.getElementById('sessionInfo');
const sessionsTable = document.getElementById('sessionsTable')?.querySelector('tbody');

// Users (cashier management)
const uName = document.getElementById('uName');
const uPass = document.getElementById('uPass');
const btnAddCashier = document.getElementById('btnAddCashier');
const uStatus = document.getElementById('uStatus');
const usersTable = document.getElementById('usersTable').querySelector('tbody');

function formatPrice(n) { return `${Number(n).toFixed(2)}€`; }

async function ensureAdminSession() {
  const res = await window.api.invoke('auth:getSession');
  if (!res?.user) {
    window.location = 'login.html';
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

async function loadAuthMode() {
  const res = await window.api.invoke('config:getCashierAuthMode');
  if (res?.ok) {
    authModeSelect.value = res.mode || 'password';
  }
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
  window.location = 'login.html';
});

goPos.addEventListener('click', () => {
  window.location = 'index.html';
});

function todayStr(d) {
  return d.toISOString().slice(0,10);
}

async function refreshWorkSessionInfo() {
  const cur = await window.api.invoke('workSession:getCurrent');
  const s = cur.session;
  if (s) {
    sessionInfo.textContent = `Session ouverte #${s.id} · depuis ${s.opened_at.replace('T',' ').slice(0,16)}`;
    btnOpenSession.disabled = true; btnCloseSession.disabled = false;
  } else {
    sessionInfo.textContent = 'Aucune session ouverte';
    btnOpenSession.disabled = false; btnCloseSession.disabled = true;
  }
}

async function loadSessionsHistory() {
  const list = await window.api.invoke('workSession:list');
  if (!sessionsTable) return;
  sessionsTable.innerHTML = list.map(s => `
    <tr data-id="${s.id}">
      <td>${s.id}</td>
      <td>${s.opened_by}</td>
      <td>${s.opened_at.replace('T',' ').slice(0,16)}</td>
      <td>${s.closed_at ? s.closed_at.replace('T',' ').slice(0,16) : '-'}</td>
      <td><button data-view-sales>Voir ventes</button></td>
    </tr>
  `).join('');
  sessionsTable.querySelectorAll('button[data-view-sales]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tr = btn.closest('tr');
      const sid = Number(tr.getAttribute('data-id'));
      window.location = `session-sales.html?sessionId=${sid}`;
    });
  });
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
      <td>
        <button data-detail>Voir détail</button>
        <button data-cancel>Supprimer</button>
      </td>
    </tr>
  `).join('');
  bindSalesActions();
}

function bindSalesActions() {
  const ticketModal = document.getElementById('ticketModal');
  const ticketInfo = document.getElementById('ticketInfo');
  const ticketItems = document.getElementById('ticketItems');
  const closeTicket = document.getElementById('closeTicket');

  salesTable.querySelectorAll('button[data-detail]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const saleId = Number(tr.getAttribute('data-id'));
      const res = await window.api.invoke('sales:getDetail', saleId);
      if (!res?.ok) { sStatus.textContent = res?.error || 'Échec détail'; return; }
      const { sale, items } = res;
      ticketInfo.textContent = `Ticket #${sale.id} · Total ${formatPrice(sale.total)} · ${sale.created_at.replace('T',' ').slice(0,16)}`;
      ticketItems.innerHTML = items.map(i => `
        <tr>
          <td>${i.name}</td>
          <td>${formatPrice(i.price)}</td>
          <td>${i.quantity}</td>
          <td>${formatPrice(i.price * i.quantity)}</td>
        </tr>
      `).join('');
      ticketModal.classList.remove('hidden');
      ticketModal.setAttribute('aria-hidden','false');
    });
  });
  salesTable.querySelectorAll('button[data-cancel]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const saleId = Number(tr.getAttribute('data-id'));
      const sess = await window.api.invoke('auth:getSession');
      const admin_id = sess?.user?.id;
      const res = await window.api.invoke('sales:cancel', { saleId, admin_id });
      if (res?.ok) { sStatus.textContent = 'Vente annulée.'; await loadSales(); }
      else { sStatus.textContent = res?.error || 'Échec annulation'; }
    });
  });
  closeTicket.addEventListener('click', () => {
    ticketModal.classList.add('hidden');
    ticketModal.setAttribute('aria-hidden','true');
  });
}

btnLoadSales.addEventListener('click', loadSales);
btnLoadAllSales.addEventListener('click', async () => {
  const list = await window.api.invoke('sales:getAll');
  salesTable.innerHTML = list.map(s => `
    <tr data-id="${s.id}">
      <td>#${s.id}</td>
      <td>${formatPrice(s.total)}</td>
      <td>${s.created_at.replace('T',' ').slice(0,16)}</td>
      <td>${s.cashier_id}</td>
      <td>
        <button data-detail>Voir détail</button>
        <button data-cancel>Supprimer</button>
      </td>
    </tr>
  `).join('');
  bindSalesActions();
});

btnOpenSession.addEventListener('click', async () => {
  const res = await window.api.invoke('workSession:open');
  sessionInfo.textContent = res?.ok ? `Session ouverte #${res.sessionId}` : (res?.error || 'Échec ouverture');
  await refreshWorkSessionInfo();
  await loadSessionsHistory();
});
btnCloseSession.addEventListener('click', async () => {
  const res = await window.api.invoke('workSession:close');
  sessionInfo.textContent = res?.ok ? 'Session fermée.' : (res?.error || 'Échec fermeture');
  await refreshWorkSessionInfo();
  await loadSessionsHistory();
});

btnAddCashier.addEventListener('click', async () => {
  const username = (uName.value||'').trim();
  const password = uPass.value||'';
  uStatus.textContent = 'Ajout...';
  const res = await window.api.invoke('users:add', { username, password, role: 'cashier' });
  if (!res?.ok) { uStatus.textContent = res?.error || 'Échec ajout'; return; }
  uStatus.textContent = `Caissier '${res.user.username}' ajouté.`;
  uName.value=''; uPass.value='';
  await loadUsers();
});

async function loadUsers() {
  const items = await window.api.invoke('users:getAll');
  usersTable.innerHTML = items.map(u => `
    <tr data-id="${u.id}">
      <td>${u.id}</td>
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td>
        <input type="password" placeholder="Nouveau mot de passe" data-newpw />
        <button data-reset ${u.role==='admin' ? 'disabled' : ''}>Réinitialiser</button>
        <button data-delete ${u.role==='admin' ? 'disabled' : ''}>Supprimer</button>
      </td>
    </tr>
  `).join('');

  usersTable.querySelectorAll('button[data-reset]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const uid = Number(tr.getAttribute('data-id'));
      const pw = tr.querySelector('[data-newpw]').value;
      uStatus.textContent = 'Mise à jour...';
      const res = await window.api.invoke('users:resetPassword', { userId: uid, newPassword: pw });
      uStatus.textContent = res?.ok ? 'Mot de passe mis à jour.' : (res?.error || 'Échec');
      tr.querySelector('[data-newpw]').value = '';
    });
  });
  usersTable.querySelectorAll('button[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const uid = Number(tr.getAttribute('data-id'));
      if (!confirm('Supprimer cet utilisateur ?')) return;
      uStatus.textContent = 'Suppression...';
      const res = await window.api.invoke('users:delete', { userId: uid });
      if (res?.ok) { uStatus.textContent = 'Utilisateur supprimé.'; loadUsers(); }
      else { uStatus.textContent = res?.error || 'Échec'; }
    });
  });
}

// Auth mode settings
btnSaveAuthMode.addEventListener('click', async () => {
  authStatus.textContent = 'Sauvegarde...';
  const mode = authModeSelect.value;
  const res = await window.api.invoke('config:setCashierAuthMode', { mode });
  if (res?.ok) {
    authStatus.textContent = 'Paramètres sauvegardés.';
    setTimeout(() => { authStatus.textContent = ''; }, 2000);
  } else {
    authStatus.textContent = res?.error || 'Erreur lors de la sauvegarde';
  }
});

window.addEventListener('DOMContentLoaded', async () => {
  if (!(await ensureAdminSession())) return;
  await refreshWorkSessionInfo();
  await loadSessionsHistory();
  await loadUsers();
  await loadCategories();
  await loadProducts();
  await loadAuthMode();
  const t = todayStr(new Date()); fromDate.value = t; toDate.value = t; await loadSales();
});
