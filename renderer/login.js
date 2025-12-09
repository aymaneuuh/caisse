const roles = document.querySelectorAll('.role-chooser .role');
const adminForm = document.getElementById('adminForm');
const cashierForm = document.getElementById('cashierForm');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const cashierUser = document.getElementById('cashierUser');
const cashierPass = document.getElementById('cashierPass');
const cashierSelect = document.getElementById('cashierSelect');
const passwordMode = document.getElementById('passwordMode');
const cashierSelector = document.getElementById('cashierSelector');
const btnLogin = document.getElementById('btnLogin');
const loginStatus = document.getElementById('loginStatus');

let chosenRole = 'cashier';
let cashierAuthMode = 'password'; // will be loaded from config

roles.forEach(b => b.addEventListener('click', () => {
  roles.forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  chosenRole = b.getAttribute('data-role');
  
  if (chosenRole === 'admin') {
    adminForm.style.display = 'block';
    cashierForm.style.display = 'none';
  } else {
    adminForm.style.display = 'none';
    cashierForm.style.display = 'block';
  }
}));

// Load cashier auth mode and populate select if needed
async function initCashierAuth() {
  const res = await window.api.invoke('config:getCashierAuthMode');
  cashierAuthMode = res?.mode || 'password';
  
  if (cashierAuthMode === 'select') {
    // Load list of caissiers
    const users = await window.api.invoke('users:getAll');
    if (users?.ok && users.users) {
      const cashiers = users.users.filter(u => u.role === 'cashier');
      cashierSelect.innerHTML = cashiers.map(u => `<option value="${u.id}">${u.username}</option>`).join('');
    }
    passwordMode.style.display = 'none';
    cashierSelector.classList.add('active');
  } else {
    passwordMode.style.display = 'block';
    cashierSelector.classList.remove('active');
  }
}

// Init on load
window.addEventListener('DOMContentLoaded', async () => {
  await initCashierAuth();
  
  const res = await window.api.invoke('auth:getSession');
  const u = res?.user;
  if (u) { if (u.role === 'admin') window.location = 'admin.html'; else window.location = 'index.html'; }
});

btnLogin.addEventListener('click', doLogin);
loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
cashierPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  loginStatus.textContent = 'Connexion en cours...';
  loginStatus.classList.remove('error', 'success');
  
  if (chosenRole === 'admin') {
    // Admin login with password
    const username = (loginUser.value||'').trim();
    const password = loginPass.value||'';
    const res = await window.api.invoke('auth:login', { username, password });
    if (!res?.ok) { 
      loginStatus.textContent = res?.error || 'Échec de connexion';
      loginStatus.classList.add('error');
      return; 
    }
    const user = res.user;
    if (!user || user.role !== 'admin') {
      loginStatus.textContent = "Ce compte n'est pas Administrateur";
      loginStatus.classList.add('error');
      return;
    }
    loginStatus.textContent = '';
    window.location = 'admin.html';
  } else {
    // Cashier login
    if (cashierAuthMode === 'password') {
      // Password mode
      const username = (cashierUser.value||'').trim();
      const password = cashierPass.value||'';
      const res = await window.api.invoke('auth:login', { username, password });
      if (!res?.ok) {
        loginStatus.textContent = res?.error || 'Échec de connexion';
        loginStatus.classList.add('error');
        return;
      }
      const user = res.user;
      if (!user || user.role !== 'cashier') {
        loginStatus.textContent = "Ce compte n'est pas Caissier";
        loginStatus.classList.add('error');
        return;
      }
      loginStatus.textContent = '';
      window.location = 'index.html';
    } else {
      // Select mode - just select user by ID
      const userId = Number(cashierSelect.value);
      if (!userId) {
        loginStatus.textContent = 'Sélectionnez un caissier';
        loginStatus.classList.add('error');
        return;
      }
      const res = await window.api.invoke('auth:selectCashier', { userId });
      if (!res?.ok) {
        loginStatus.textContent = res?.error || 'Erreur de connexion';
        loginStatus.classList.add('error');
        return;
      }
      loginStatus.textContent = '';
      window.location = 'index.html';
    }
  }
}
