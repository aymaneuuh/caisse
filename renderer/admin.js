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
const btnExportSales = document.getElementById('btnExportSales');
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

// Setup section navigation
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all buttons
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Hide all sections
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      
      // Show selected section
      const sectionId = btn.getAttribute('data-section');
      const section = document.getElementById(`section-${sectionId}`);
      if (section) {
        section.classList.add('active');
      }
      
      // Load data for section if needed
      if (sectionId === 'products') loadProducts();
      else if (sectionId === 'users') loadUsers();
      else if (sectionId === 'sales') {
        const today = new Date();
        fromDate.valueAsDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        toDate.valueAsDate = today;
      }
      else if (sectionId === 'stats') {
        loadStatistics();
      }
      else if (sectionId === 'dashboard') {
        loadDashboard();
      }
    });
  });
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Today's sales
    const todaySales = await window.api.invoke('sales:getByDate', {
      from: todayStart.toISOString(),
      to: todayEnd.toISOString()
    });

    const todayTotal = todaySales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    const todayCount = todaySales.length;
    const todayAvg = todayCount > 0 ? todayTotal / todayCount : 0;

    document.getElementById('dashTodaySales').textContent = todayTotal.toFixed(2) + '€';
    document.getElementById('dashTodayTickets').textContent = todayCount;
    document.getElementById('dashAvgBasket').textContent = todayAvg.toFixed(2) + '€';

    // Current session status
    const currentSession = await window.api.invoke('workSession:getCurrent');
    if (currentSession?.session) {
      document.getElementById('dashSessionStatus').textContent = 'Ouverte';
      document.getElementById('dashSessionStatus').style.color = '#4ade80';
    } else {
      document.getElementById('dashSessionStatus').textContent = 'Fermée';
      document.getElementById('dashSessionStatus').style.color = '#f87171';
    }

    // 7 days stats
    const sales7d = await window.api.invoke('sales:getByDate', {
      from: sevenDaysAgo.toISOString(),
      to: todayEnd.toISOString()
    });
    const total7d = sales7d.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    const count7d = sales7d.length;
    const avg7d = count7d > 0 ? total7d / count7d : 0;

    document.getElementById('dash7dSales').textContent = total7d.toFixed(2) + '€';
    document.getElementById('dash7dTickets').textContent = count7d;
    document.getElementById('dash7dAvg').textContent = avg7d.toFixed(2) + '€';

    // 30 days stats
    const sales30d = await window.api.invoke('sales:getByDate', {
      from: thirtyDaysAgo.toISOString(),
      to: todayEnd.toISOString()
    });
    const total30d = sales30d.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    const count30d = sales30d.length;
    const avg30d = count30d > 0 ? total30d / count30d : 0;

    document.getElementById('dash30dSales').textContent = total30d.toFixed(2) + '€';
    document.getElementById('dash30dTickets').textContent = count30d;
    document.getElementById('dash30dAvg').textContent = avg30d.toFixed(2) + '€';

    // Recent sales (last 10)
    const users = await window.api.invoke('users:getAll');
    const recentTable = document.getElementById('dashRecentSales').querySelector('tbody');
    recentTable.innerHTML = sales30d.slice(0, 10).map(sale => {
      const cashier = users.find(u => u.id === sale.cashier_id);
      const date = new Date(sale.created_at);
      const dateStr = date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return `
        <tr>
          <td>#${sale.id}</td>
          <td>${dateStr}</td>
          <td>${cashier?.username || 'Inconnu'}</td>
          <td>${parseFloat(sale.total).toFixed(2)}€</td>
          <td>${sale.payment_method === 'cash' ? 'Espèces' : 'Carte'}</td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('Erreur chargement dashboard:', error);
  }
}

// ===== STATISTICS =====
async function loadStatistics() {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Récupérer les ventes des 30 derniers jours
    const allSales = await window.api.invoke('sales:getByDate', {
      from: thirtyDaysAgo.toISOString(),
      to: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
    });

    if (!Array.isArray(allSales)) return;

    // KPIs
    const totalSales = allSales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    const totalCash = allSales
      .filter(s => s.payment_method === 'cash')
      .reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
    const avgBasket = allSales.length > 0 ? totalSales / allSales.length : 0;

    document.getElementById('statsTotalSales').textContent = totalSales.toFixed(2) + '€';
    document.getElementById('statsTickets').textContent = allSales.length;
    document.getElementById('statsAverage').textContent = avgBasket.toFixed(2) + '€';
    document.getElementById('statsCash').textContent = totalCash.toFixed(2) + '€';

    // Produits les plus vendus
    const productStats = {};
    for (const sale of allSales) {
      const detail = await window.api.invoke('sales:getDetail', sale.id);
      if (detail?.items) {
        detail.items.forEach(item => {
          if (!productStats[item.name]) {
            productStats[item.name] = { qty: 0, total: 0 };
          }
          productStats[item.name].qty += item.quantity;
          productStats[item.name].total += item.quantity * parseFloat(item.price || 0);
        });
      }
    }

    const productsTable = document.getElementById('statsProductsTable').querySelector('tbody');
    productsTable.innerHTML = Object.entries(productStats)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([name, stats]) => `
        <tr>
          <td>${name}</td>
          <td>${stats.qty}</td>
          <td>${stats.total.toFixed(2)}€</td>
        </tr>
      `).join('');

    // Caissiers les plus productifs
    const users = await window.api.invoke('users:getAll');
    const cashierStats = {};
    
    allSales.forEach(sale => {
      if (!cashierStats[sale.cashier_id]) {
        const user = users.find(u => u.id === sale.cashier_id);
        cashierStats[sale.cashier_id] = { 
          name: user?.username || 'Inconnu',
          tickets: 0,
          total: 0
        };
      }
      cashierStats[sale.cashier_id].tickets += 1;
      cashierStats[sale.cashier_id].total += parseFloat(sale.total || 0);
    });

    const cashiersTable = document.getElementById('statsCashiersTable').querySelector('tbody');
    const sortedCashiers = Object.values(cashierStats).sort((a, b) => b.total - a.total);
    cashiersTable.innerHTML = sortedCashiers
      .map(cashier => `
        <tr>
          <td>${cashier.name}</td>
          <td>${cashier.tickets}</td>
          <td>${cashier.total.toFixed(2)}€</td>
        </tr>
      `).join('');

    // Charts
    renderChartsForStatistics(allSales, productStats, sortedCashiers);

  } catch (error) {
    console.error('Erreur chargement statistiques:', error);
  }
}

function renderChartsForStatistics(allSales, productStats, sortedCashiers) {
  // Chart 1: Revenue trend (last 7 days)
  const salesByDate = {};
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
    salesByDate[dateStr] = 0;
  }

  allSales.forEach(sale => {
    // Parse created_at (ISO string like "2024-12-10T15:30:45.123Z")
    const saleDate = new Date(sale.created_at);
    const dateStr = saleDate.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
    if (dateStr in salesByDate) {
      salesByDate[dateStr] += parseFloat(sale.total || 0);
    }
  });

  const ctxRevenue = document.getElementById('chartRevenue')?.getContext('2d');
  if (ctxRevenue) {
    new Chart(ctxRevenue, {
      type: 'line',
      data: {
        labels: Object.keys(salesByDate),
        datasets: [{
          label: 'Chiffre d\'affaires',
          data: Object.values(salesByDate),
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => v.toFixed(0) + '€' }
          }
        }
      }
    });
  }

  // Chart 2: Payment methods distribution
  const totalCash = allSales
    .filter(s => s.payment_method === 'cash')
    .reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
  const totalCard = allSales
    .filter(s => s.payment_method === 'card')
    .reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

  const ctxPayment = document.getElementById('chartPayment')?.getContext('2d');
  if (ctxPayment) {
    new Chart(ctxPayment, {
      type: 'doughnut',
      data: {
        labels: ['Espèces', 'Carte'],
        datasets: [{
          data: [totalCash, totalCard],
          backgroundColor: ['#059669', '#2563eb'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  // Chart 3: Top 5 products
  const top5Products = Object.entries(productStats)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5);

  const ctxProducts = document.getElementById('chartProducts')?.getContext('2d');
  if (ctxProducts) {
    new Chart(ctxProducts, {
      type: 'bar',
      data: {
        labels: top5Products.map(p => p[0]),
        datasets: [{
          label: 'Quantité vendue',
          data: top5Products.map(p => p[1].qty),
          backgroundColor: '#16a34a',
          borderColor: '#15803d',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { beginAtZero: true }
        }
      }
    });
  }

  // Chart 4: Top cashiers by revenue
  const top5Cashiers = sortedCashiers.slice(0, 5);

  const ctxCashiers = document.getElementById('chartCashiers')?.getContext('2d');
  if (ctxCashiers) {
    new Chart(ctxCashiers, {
      type: 'bar',
      data: {
        labels: top5Cashiers.map(c => c.name),
        datasets: [{
          label: 'Chiffre d\'affaires',
          data: top5Cashiers.map(c => c.total),
          backgroundColor: '#ea580c',
          borderColor: '#d97706',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { callback: v => v.toFixed(0) + '€' }
          }
        }
      }
    });
  }
}

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

btnExportSales.addEventListener('click', async () => {
  try {
    sStatus.textContent = 'Export en cours...';
    
    // Get sales in current range
    const from = fromDate.value ? new Date(fromDate.value).toISOString() : new Date(0).toISOString();
    const to = toDate.value ? new Date(toDate.value + 'T23:59:59').toISOString() : new Date().toISOString();
    const sales = await window.api.invoke('sales:getByDate', { from, to });
    
    if (!sales || sales.length === 0) {
      sStatus.textContent = 'Aucune vente à exporter';
      return;
    }

    // Get users for cashier names
    const users = await window.api.invoke('users:getAll');
    
    // Build CSV
    let csv = 'Ticket,Date,Heure,Caissier,Total,Paiement,Especes_Remis,Rendu\n';
    
    for (const sale of sales) {
      const cashier = users.find(u => u.id === sale.cashier_id);
      const date = new Date(sale.created_at);
      const dateStr = date.toLocaleDateString('fr-FR');
      const timeStr = date.toLocaleTimeString('fr-FR');
      const paymentMethod = sale.payment_method === 'cash' ? 'Espèces' : 'Carte';
      const cashReceived = sale.cash_received || '';
      const change = sale.change || '';
      
      csv += `#${sale.id},${dateStr},${timeStr},${cashier?.username || 'Inconnu'},${sale.total},${paymentMethod},${cashReceived},${change}\n`;
    }
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ventes_${fromDate.value || 'all'}_${toDate.value || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    sStatus.textContent = `${sales.length} ventes exportées`;
    setTimeout(() => sStatus.textContent = '', 3000);
  } catch (error) {
    console.error('Erreur export:', error);
    sStatus.textContent = 'Erreur lors de l\'export';
  }
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
  setupNavigation();
  await loadDashboard();
  await refreshWorkSessionInfo();
  await loadSessionsHistory();
  await loadUsers();
  await loadCategories();
  await loadProducts();
  await loadAuthMode();
  const t = todayStr(new Date()); fromDate.value = t; toDate.value = t; await loadSales();
});
