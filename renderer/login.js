const roles = document.querySelectorAll('.role-chooser .role');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const btnLogin = document.getElementById('btnLogin');
const loginStatus = document.getElementById('loginStatus');

let chosenRole = 'cashier';
roles.forEach(b => b.addEventListener('click', () => {
  roles.forEach(x => x.classList.remove('primary'));
  b.classList.add('primary');
  chosenRole = b.getAttribute('data-role');
}));

// default select cashier
document.querySelector('[data-role="cashier"]').classList.add('primary');

btnLogin.addEventListener('click', doLogin);
loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  loginStatus.textContent = 'Connexion...';
  const username = (loginUser.value||'').trim();
  const password = loginPass.value||'';
  const res = await window.api.invoke('auth:login', { username, password });
  if (!res?.ok) { loginStatus.textContent = res?.error || 'Échec de connexion'; return; }
  const user = res.user;
  if (!user) { loginStatus.textContent = 'Session invalide'; return; }
  if (chosenRole === 'admin' && user.role !== 'admin') { loginStatus.textContent = "Ce compte n'est pas Administrateur"; return; }
  if (chosenRole === 'cashier' && user.role !== 'cashier') { loginStatus.textContent = "Ce compte n'est pas Caissier"; return; }
  loginStatus.textContent = '';
  if (user.role === 'admin') window.location = 'admin.html'; else window.location = 'index.html';
}

// If already logged, redirect to their area
window.addEventListener('DOMContentLoaded', async () => {
  const res = await window.api.invoke('auth:getSession');
  const u = res?.user;
  if (u) { if (u.role === 'admin') window.location = 'admin.html'; else window.location = 'index.html'; }
});
