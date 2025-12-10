// Dashboard - KPIs, Graphiques et Recherche avancée
let allSales = [];
let allCashiers = [];
let currentSession = null;
let chartCADaily = null;
let chartTopProducts = null;

document.addEventListener('DOMContentLoaded', async () => {
	// Vérification auth
	const res = await window.api.invoke('auth:getSession');
	if (!res?.user || res.user.role !== 'admin') {
		window.location.href = 'login.html';
		return;
	}

	// Chargement données
	await loadData();
	initCharts();
	setupEventListeners();

	// Rafraîchissement KPIs toutes les 30 secondes
	setInterval(updateKPIs, 30000);
});

async function loadData() {
	try {
		// Ventes du jour
		const today = new Date();
		const dateFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const dateTo = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

		allSales = await window.api.invoke('sales:getByDate', {
			from: dateFrom.toISOString(),
			to: dateTo.toISOString()
		});

		// Caissiers (pour filtres)
		allCashiers = await window.api.invoke('users:getAllCashiers');
		populateCashierFilter();

		// Session actuelle
		currentSession = await window.api.invoke('workSession:getCurrent');

		updateKPIs();
	} catch (error) {
		console.error('Erreur chargement données:', error);
	}
}

function populateCashierFilter() {
	const select = document.getElementById('filterCashier');
	allCashiers.forEach(cashier => {
		const option = document.createElement('option');
		option.value = cashier.id;
		option.textContent = cashier.username;
		select.appendChild(option);
	});
}

function updateKPIs() {
	if (allSales.length === 0) {
		document.getElementById('kpiCA').textContent = '0.00 €';
		document.getElementById('kpiTickets').textContent = '0';
		document.getElementById('kpiAverage').textContent = '0.00 €';
		return;
	}

	// CA du jour
	const totalCA = allSales.reduce((sum, sale) => sum + parseFloat(sale.total || 0), 0);
	document.getElementById('kpiCA').textContent = totalCA.toFixed(2) + ' €';

	// Nombre de tickets
	document.getElementById('kpiTickets').textContent = allSales.length;

	// Panier moyen
	const avgBasket = totalCA / allSales.length;
	document.getElementById('kpiAverage').textContent = avgBasket.toFixed(2) + ' €';

	// Session actuelle
	if (currentSession) {
		const sessionTime = new Date(currentSession.opened_at).toLocaleTimeString('fr-FR', {
			hour: '2-digit',
			minute: '2-digit'
		});
		document.getElementById('kpiSession').textContent = 'Ouverte';
		document.getElementById('kpiSession').style.color = 'var(--success)';
	} else {
		document.getElementById('kpiSession').textContent = 'Fermée';
		document.getElementById('kpiSession').style.color = 'var(--muted)';
	}
}

function initCharts() {
	// Graphique CA par jour (7 derniers jours)
	const canvasDaily = document.getElementById('chartCADaily');
	const dailyData = getCAByDay();

	chartCADaily = new Chart(canvasDaily, {
		type: 'bar',
		data: {
			labels: dailyData.labels,
			datasets: [{
				label: 'CA (€)',
				data: dailyData.values,
				backgroundColor: 'rgba(37, 99, 235, 0.7)',
				borderColor: 'rgba(37, 99, 235, 1)',
				borderWidth: 2,
				borderRadius: 6
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: {
					display: false
				}
			},
			scales: {
				y: {
					beginAtZero: true,
					ticks: {
						callback: value => value.toFixed(2) + ' €'
					}
				}
			}
		}
	});

	// Graphique top produits
	const canvasProducts = document.getElementById('chartTopProducts');
	const topData = getTopProducts();

	chartTopProducts = new Chart(canvasProducts, {
		type: 'doughnut',
		data: {
			labels: topData.labels,
			datasets: [{
				data: topData.values,
				backgroundColor: [
					'rgba(37, 99, 235, 0.7)',
					'rgba(22, 163, 74, 0.7)',
					'rgba(234, 88, 12, 0.7)',
					'rgba(220, 38, 38, 0.7)',
					'rgba(59, 130, 246, 0.7)'
				],
				borderWidth: 2,
				borderColor: '#fff'
			}]
		},
		options: {
			responsive: true,
			maintainAspectRatio: true,
			plugins: {
				legend: {
					position: 'bottom'
				}
			}
		}
	});
}

function getCAByDay() {
	const days = 7;
	const labels = [];
	const values = [];
	const caByDay = {};

	// Initialiser 7 derniers jours
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date();
		d.setDate(d.getDate() - i);
		const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' });
		const dateKey = d.toISOString().split('T')[0];
		labels.push(dateStr);
		caByDay[dateKey] = 0;
	}

	// Grouper ventes par jour (toutes les ventes, pas juste aujourd'hui)
	const allSalesHistory = [];
	const now = new Date();
	const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

	// Charger ventes des 7 derniers jours
	// Pour cette démo, on utilise allSales (jour actuel)
	// En production, utiliser sales:getByDate avec plage 7 jours
	allSales.forEach(sale => {
		const saleDate = new Date(sale.created_at);
		const dateKey = saleDate.toISOString().split('T')[0];
		if (caByDay.hasOwnProperty(dateKey)) {
			caByDay[dateKey] += parseFloat(sale.total || 0);
		}
	});

	Object.keys(caByDay).sort().forEach(key => {
		values.push(caByDay[key]);
	});

	return { labels, values };
}

function getTopProducts() {
	const productCount = {};
	const products = {};

	allSales.forEach(sale => {
		if (!sale.items) return;
		sale.items.forEach(item => {
			productCount[item.product_id] = (productCount[item.product_id] || 0) + item.quantity;
			if (!products[item.product_id]) {
				products[item.product_id] = item.product_name || 'Produit #' + item.product_id;
			}
		});
	});

	// Top 5
	const sorted = Object.entries(productCount)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5);

	const labels = sorted.map(([id]) => products[id]);
	const values = sorted.map(([, count]) => count);

	return { labels, values };
}

function setupEventListeners() {
	document.getElementById('btnBack').addEventListener('click', () => {
		window.location.href = 'admin.html';
	});

	document.getElementById('btnLogout').addEventListener('click', async () => {
		await window.api.invoke('auth:logout');
		window.location.href = 'login.html';
	});

	document.getElementById('btnSessionInfo').addEventListener('click', showSessionInfo);
	document.getElementById('btnSearch').addEventListener('click', performAdvancedSearch);
	document.getElementById('btnReset').addEventListener('click', resetFilters);

	// Dates par défaut (aujourd'hui et 30 jours avant)
	const today = new Date();
	const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
	document.getElementById('filterDateFrom').valueAsDate = thirtyDaysAgo;
	document.getElementById('filterDateTo').valueAsDate = today;
}

function showSessionInfo() {
	const content = document.getElementById('sessionInfoContent');
	
	if (!currentSession) {
		content.innerHTML = '<p style="color: var(--muted);">Aucune session ouverte actuellement.</p>';
	} else {
		const openedAt = new Date(currentSession.opened_at).toLocaleString('fr-FR');
		const closedAt = currentSession.closed_at 
			? new Date(currentSession.closed_at).toLocaleString('fr-FR')
			: 'En cours...';
		
		const cashierName = allCashiers.find(c => c.id === currentSession.opened_by)?.username || 'Inconnu';
		const sessionSales = allSales.filter(s => s.session_id === currentSession.id);
		const sessionTotal = sessionSales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);

		content.innerHTML = `
			<div style="background: var(--bg); padding: 16px; border-radius: 6px; gap: 12px; display: flex; flex-direction: column;">
				<div><strong>ID Session:</strong> #${currentSession.id}</div>
				<div><strong>Ouvert par:</strong> ${cashierName}</div>
				<div><strong>Ouvert à:</strong> ${openedAt}</div>
				<div><strong>Fermé à:</strong> ${closedAt}</div>
				<div><strong>Tickets:</strong> ${sessionSales.length}</div>
				<div style="font-size: 18px; font-weight: 700; color: var(--primary);"><strong>Total:</strong> ${sessionTotal.toFixed(2)} €</div>
			</div>
		`;
	}

	document.getElementById('modalSessionInfo').classList.remove('hidden');
}

async function performAdvancedSearch() {
	const dateFrom = new Date(document.getElementById('filterDateFrom').value);
	const dateTo = new Date(document.getElementById('filterDateTo').value);
	const cashierId = document.getElementById('filterCashier').value;
	const paymentMethod = document.getElementById('filterPayment').value;
	const minAmount = parseFloat(document.getElementById('filterMinAmount').value) || 0;
	const maxAmount = parseFloat(document.getElementById('filterMaxAmount').value) || Infinity;

	try {
		const results = await window.api.invoke('sales:getByDate', {
			dateFrom: dateFrom.toISOString(),
			dateTo: new Date(dateTo.getTime() + 24 * 60 * 60 * 1000).toISOString()
		});

		// Filtrer côté client
		let filtered = results.filter(sale => {
			let match = true;
			if (cashierId) match = match && sale.cashier_id === parseInt(cashierId);
			if (paymentMethod) match = match && sale.payment_method === paymentMethod;
			const total = parseFloat(sale.total || 0);
			match = match && total >= minAmount && total <= maxAmount;
			return match;
		});

		displaySearchResults(filtered);
	} catch (error) {
		console.error('Erreur recherche:', error);
	}
}

function displaySearchResults(results) {
	const resultsDiv = document.getElementById('searchResults');
	const resultsTable = document.getElementById('resultsTable');
	const resultsTitle = document.getElementById('resultsTitle');

	resultsTitle.textContent = `${results.length} résultat(s)`;
	resultsTable.innerHTML = '';

	if (results.length === 0) {
		resultsDiv.style.display = 'none';
		return;
	}

	results.forEach(sale => {
		const cashierName = allCashiers.find(c => c.id === sale.cashier_id)?.username || 'Inconnu';
		const saleDate = new Date(sale.created_at).toLocaleString('fr-FR');
		const paymentLabel = sale.payment_method === 'cash' ? 'Espèces' : 'Carte';

		const tr = document.createElement('tr');
		tr.innerHTML = `
			<td>#${sale.id}</td>
			<td>${saleDate}</td>
			<td>${cashierName}</td>
			<td>${parseFloat(sale.total || 0).toFixed(2)} €</td>
			<td>${paymentLabel}</td>
			<td>
				<button class="icon" style="padding: 4px 8px; font-size: 12px;" onclick="showSaleDetail(${sale.id})">Détail</button>
			</td>
		`;
		resultsTable.appendChild(tr);
	});

	resultsDiv.style.display = 'block';
}

async function showSaleDetail(saleId) {
	try {
		const detail = await window.api.invoke('sales:getDetail', { id: saleId });
		const cashierName = allCashiers.find(c => c.id === detail.cashier_id)?.username || 'Inconnu';

		let itemsHtml = '<table class="admin-table"><thead><tr><th>Article</th><th>Qté</th><th>P.U.</th><th>Total</th></tr></thead><tbody>';
		if (detail.items) {
			detail.items.forEach(item => {
				const total = (item.quantity * parseFloat(item.price || 0)).toFixed(2);
				itemsHtml += `<tr><td>${item.product_name}</td><td>${item.quantity}</td><td>${parseFloat(item.price || 0).toFixed(2)} €</td><td>${total} €</td></tr>`;
			});
		}
		itemsHtml += '</tbody></table>';

		const paymentLabel = detail.payment_method === 'cash' ? 'Espèces' : 'Carte';
		const changeInfo = detail.payment_method === 'cash' && detail.change
			? `<div><strong>Montant remis:</strong> ${parseFloat(detail.cash_received || 0).toFixed(2)} €</div><div><strong>Rendu:</strong> ${parseFloat(detail.change || 0).toFixed(2)} €</div>`
			: '';

		const content = `
			<div style="background: var(--bg); padding: 16px; border-radius: 6px; display: flex; flex-direction: column; gap: 12px;">
				<div><strong>Ticket #${detail.id}</strong></div>
				<div><strong>Date:</strong> ${new Date(detail.created_at).toLocaleString('fr-FR')}</div>
				<div><strong>Caissier:</strong> ${cashierName}</div>
				<div><strong>Mode paiement:</strong> ${paymentLabel}</div>
				${changeInfo}
				<div style="border-top: 1px solid var(--border); padding-top: 12px;">
					${itemsHtml}
				</div>
				<div style="font-size: 18px; font-weight: 700; color: var(--primary); text-align: right;">
					Total: ${parseFloat(detail.total || 0).toFixed(2)} €
				</div>
			</div>
		`;

		document.getElementById('saleDetailContent').innerHTML = content;
		document.getElementById('modalSaleDetail').classList.remove('hidden');
	} catch (error) {
		console.error('Erreur détail vente:', error);
	}
}

function resetFilters() {
	const today = new Date();
	const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
	
	document.getElementById('filterDateFrom').valueAsDate = thirtyDaysAgo;
	document.getElementById('filterDateTo').valueAsDate = today;
	document.getElementById('filterCashier').value = '';
	document.getElementById('filterPayment').value = '';
	document.getElementById('filterMinAmount').value = '';
	document.getElementById('filterMaxAmount').value = '';
	document.getElementById('searchResults').style.display = 'none';
}
