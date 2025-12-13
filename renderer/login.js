// --- Récupération des éléments DOM ---
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

// Nouveaux éléments (Navigation Admin)
const btnShowAdmin = document.getElementById('btnShowAdmin');
const btnBackToCashier = document.getElementById('btnBackToCashier');
const adminLinkContainer = document.getElementById('adminLinkContainer');

// Elements Assistant IA
const aiFab = document.getElementById('ai-fab');
const aiChatWindow = document.getElementById('ai-chat-window');
const aiCloseBtn = document.getElementById('ai-close-btn');
const aiSendBtn = document.getElementById('ai-send-btn');
const aiInput = document.getElementById('ai-input');
const aiMessages = document.getElementById('ai-messages');

let chosenRole = 'cashier';
let cashierAuthMode = 'password'; 


// --- GESTION DU BASCULEMENT CAISSIER <-> ADMIN ---

// Clic sur "Accès Administration"
btnShowAdmin.addEventListener('click', () => {
  chosenRole = 'admin';
  cashierForm.style.display = 'none';
  adminLinkContainer.style.display = 'none'; // On cache le lien
  adminForm.style.display = 'block';
  
  // Reset message et focus
  loginStatus.textContent = '';
  loginStatus.className = '';
  loginUser.focus();
});

// Clic sur "Annuler"
btnBackToCashier.addEventListener('click', () => {
  chosenRole = 'cashier';
  adminForm.style.display = 'none';
  cashierForm.style.display = 'block';
  adminLinkContainer.style.display = 'block'; // On réaffiche le lien
  
  loginStatus.textContent = '';
  loginStatus.className = '';
});


// --- INITIALISATION AUTH CAISSIER ---

// Chargement de la config caissier (mot de passe ou liste)
async function initCashierAuth() {
  const res = await window.api.invoke('config:getCashierAuthMode');
  cashierAuthMode = res?.mode || 'password';
  
  if (cashierAuthMode === 'select') {
    // Mode liste déroulante
    const users = await window.api.invoke('users:getAllCashiers');
    if (users?.ok && users.cashiers) {
      const cashiers = users.cashiers;
      cashierSelect.innerHTML = '<option value="">-- Sélectionnez un caissier --</option>' + 
        cashiers.map(u => `<option value="${u.id}">${u.username}</option>`).join('');
    } else {
      cashierSelect.innerHTML = '<option value="">Erreur de chargement</option>';
    }
    passwordMode.style.display = 'none';
    cashierSelector.classList.add('active');
  } else {
    // Mode mot de passe
    passwordMode.style.display = 'block';
    cashierSelector.classList.remove('active');
  }
}

// Initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', async () => {
  await initCashierAuth();
  
  // Vérifie si une session existe déjà
  const res = await window.api.invoke('auth:getSession');
  const u = res?.user;
  if (u) { 
    if (u.role === 'admin') window.location = 'admin.html'; 
    else window.location = 'index.html'; 
  }
});


// --- LOGIQUE DE CONNEXION ---

btnLogin.addEventListener('click', doLogin);
// Touche entrée pour valider
loginPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
cashierPass.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
  loginStatus.textContent = 'Connexion en cours...';
  loginStatus.classList.remove('error', 'success');
  
  if (chosenRole === 'admin') {
    // Connexion Admin
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
    // Connexion Caissier
    if (cashierAuthMode === 'password') {
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
      // Mode selection simple
      const userId = Number(cashierSelect.value);
      if (!userId) {
        loginStatus.textContent = 'Veuillez sélectionner votre profil';
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


// --- GESTION ASSISTANT IA (Simulation) ---

// Ouvrir/Fermer la fenêtre
aiFab.addEventListener('click', () => {
  aiChatWindow.classList.toggle('hidden');
  if (!aiChatWindow.classList.contains('hidden')) {
    aiInput.focus();
  }
});

aiCloseBtn.addEventListener('click', () => {
  aiChatWindow.classList.add('hidden');
});

// Gestion de l'envoi de message
function handleAiSend() {
  const text = aiInput.value.trim();
  if (!text) return;

  // 1. Ajouter le message utilisateur
  addAiBubble(text, 'user');
  aiInput.value = '';

  // 2. Simulation de délai (1s)
  setTimeout(() => {
    // 3. Réponse fixe simulée
    addAiBubble("Ceci est une réponse simulée par le système IA.", 'bot');
  }, 1000);
}

// Déclencheurs (Clic bouton ou Touche Entrée)
aiSendBtn.addEventListener('click', handleAiSend);
aiInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleAiSend();
});

// Utilitaire pour créer les bulles
function addAiBubble(text, type) {
  const div = document.createElement('div');
  div.classList.add('message', type);
  div.textContent = text;
  aiMessages.appendChild(div);
  // Auto-scroll vers le bas
  aiMessages.scrollTop = aiMessages.scrollHeight;
}