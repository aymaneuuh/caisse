const sessionLabel = document.getElementById('sessionLabel');
const btnBackAdmin = document.getElementById('btnBackAdmin');
const sStatus = document.getElementById('sStatus');
const salesTable = document.getElementById('salesTable').querySelector('tbody');

function formatPrice(n) { return `${Number(n).toFixed(2)}€`; }

// Get sessionId from URL query parameter
const params = new URLSearchParams(window.location.search);
const sessionId = params.get('sessionId');

async function loadSessionSales() {
  if (!sessionId) {
    sStatus.textContent = 'Erreur: session non spécifiée.';
    return;
  }
  const list = await window.api.invoke('workSession:getSales', Number(sessionId));
  sessionLabel.textContent = `#${sessionId}`;
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
  closeTicket.addEventListener('click', () => {
    ticketModal.classList.add('hidden');
    ticketModal.setAttribute('aria-hidden','true');
  });

  salesTable.querySelectorAll('button[data-cancel]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tr = btn.closest('tr');
      const saleId = Number(tr.getAttribute('data-id'));
      const sess = await window.api.invoke('auth:getSession');
      const admin_id = sess?.user?.id;
      const res = await window.api.invoke('sales:cancel', { saleId, admin_id });
      if (res?.ok) { sStatus.textContent = 'Vente annulée.'; await loadSessionSales(); }
      else { sStatus.textContent = res?.error || 'Échec annulation'; }
    });
  });
}

btnBackAdmin.addEventListener('click', () => {
  window.location = 'admin.html';
});

window.addEventListener('DOMContentLoaded', loadSessionSales);
