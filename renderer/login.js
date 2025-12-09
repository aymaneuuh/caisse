const roles = document.querySelectorAll('.role-chooser .role');
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const btnLogin = document.getElementById('btnLogin');
const loginStatus = document.getElementById('loginStatus');

let chosenRole = 'cashier';
roles.forEach(b => b.addEventListener('click', () => {
  roles.forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  chosenRole = b.getAttribute('data-role');
}));

// default select cashier
document.querySelector('[data-role="cashier"]').classList.add('active');

btnLogin.addEventListener('click', doLogin);
loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  loginStatus.textContent = 'Connexion en cours...';
  loginStatus.classList.remove('error', 'success');
  const username = (loginUser.value||'').trim();
  const password = loginPass.value||'';
  const res = await window.api.invoke('auth:login', { username, password });
  if (!res?.ok) { 
    loginStatus.textContent = res?.error || 'Échec de connexion';
    loginStatus.classList.add('error');
    return; 
  }
  const user = res.user;
  if (!user) { 
    loginStatus.textContent = 'Session invalide';
    loginStatus.classList.add('error');
    return; 
  }
  if (chosenRole === 'admin' && user.role !== 'admin') { 
    loginStatus.textContent = "Ce compte n'est pas Administrateur";
    loginStatus.classList.add('error');
    return; 
  }
  if (chosenRole === 'cashier' && user.role !== 'cashier') { 
    loginStatus.textContent = "Ce compte n'est pas Caissier";
    loginStatus.classList.add('error');
    return; 
  }
  loginStatus.textContent = '';
  loginStatus.classList.add('success');
  if (user.role === 'admin') window.location = 'admin.html'; else window.location = 'index.html';
}

// If already logged, redirect to their area
window.addEventListener('DOMContentLoaded', async () => {
  const res = await window.api.invoke('auth:getSession');
  const u = res?.user;
  if (u) { if (u.role === 'admin') window.location = 'admin.html'; else window.location = 'index.html'; }
});
