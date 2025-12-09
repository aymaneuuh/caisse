# Caisse Electron + SQLite

Une application de caisse tactile moderne et fonctionnelle construite avec **Electron** et **SQLite**, conçue pour les petits commerces (snack, restaurant, boutique).

## 🎯 Caractéristiques

### Pour le Caissier
- **Interface tactile** optimisée pour écrans tactiles (56px min buttons, large spacing)
- **Grille de produits** grande et facile à utiliser
- **Panier** visible avec +/- pour modifier les quantités
- **Encaissement rapide** avec boutons paiement (0,50€, 1€, 2€, 5€, 10€)
- **Calcul automatique** du rendu de monnaie
- **Recherche produits** en temps réel
- **Filtre par catégorie** pour naviguer rapidement

### Pour l'Admin
- **Gestion des produits** (ajouter, éditer, supprimer)
- **Gestion des catégories**
- **Gestion des caissiers** (ajouter, réinitialiser mot de passe, supprimer)
- **Gestion des sessions** — ouverture/fermeture de sessions de travail
- **Vue complète des ventes** — filtrer par date ou consulter l'historique
- **Détail des tickets** — voir tous les articles d'une vente
- **Annulation de ventes** (admin-only)
- **Historique des sessions** avec ventes par session

### Sécurité
- **Login avec rôles** (Caissier vs Admin)
- **Authentification par mot de passe** (bcryptjs, hash côté serveur)
- **Contrôle d'accès** — seul admin peut modifier catalogue, caissiers, sessions
- **Sessions de travail** — les ventes ne peuvent être créées que si une session est ouverte
- **Audit** — historique des actions importantes

## 📋 Prérequis

- **Node.js** >= 18 LTS
- **npm** >= 9
- **Windows** (NSIS installer pour packaging)

## 🚀 Installation & Démarrage

### 1. Cloner le repo
```bash
git clone https://github.com/TON_USERNAME/caisse-electron-sqlite.git
cd caisse-electron-sqlite
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Lancer l'app en développement
```bash
npm start
```

L'app se lance à `login.html`. La base de données SQLite est créée automatiquement au premier lancement avec:
- **Admin**: `admin` / `admin`
- **Caissier**: `caissier` / `test`

## 🛠️ Scripts disponibles

- `npm start` — Lance l'app en mode développement avec DevTools
- `npm run build` — Compile l'app
- `npm run dist` — Génère l'installer Windows NSIS

## 📁 Structure du projet

```
caisse/
├── main/
│   ├── main.js                 # Point d'entrée Electron
│   ├── db.js                   # API SQLite (sql.js WASM)
│   ├── ipcHandlers.js          # Handlers IPC (CRUD, auth, sessions, ventes)
│   ├── printer.js              # Génération PDF des tickets
│   └── utils/
│       └── preload.js          # Bridge IPC sécurisé
├── renderer/
│   ├── index.html              # Interface POS (caissier)
│   ├── app.js                  # Logique POS
│   ├── login.html              # Page de connexion avec choix rôle
│   ├── login.js                # Logique login + redirection
│   ├── admin.html              # Interface admin
│   ├── admin.js                # Logique admin (produits, ventes, sessions, caissiers)
│   ├── session-sales.html      # Vue détail ventes d'une session
│   ├── session-sales.js        # Logique vue session
│   └── styles.css              # Styles tactile-friendly
├── db/
│   ├── migrations.sql          # Schéma BD
│   └── seed.sql                # Données initiales
├── dist/                       # Tickets PDF + résultats build
├── package.json
├── electron-builder.yml        # Config NSIS Windows
└── README.md
```

## 🔐 Authentification & Rôles

### Rôles
- **Admin** — Gère catalogue, caissiers, sessions, ventes
- **Caissier** — Encaisse uniquement

### Workflow Login
1. Choisir le rôle (Caissier ou Admin)
2. Entrer identifiants
3. Redirection automatique (POS ou Admin)

## 💾 Base de données

SQLite via **sql.js** (WASM, zéro dépendances natives).

**Schéma:**
- `users` — Utilisateurs avec mots de passe bcryptés
- `categories` — Catégories de produits
- `products` — Produits avec prix et catégorie
- `sessions` — Sessions de travail (admin)
- `sales` — Ventes liées à une session
- `sale_items` — Articles d'une vente
- `audit` — Log des actions

## 🎫 Workflow Caissier

1. **Connexion** (caissier / test)
2. **Parcourir** — recherche + filtres par catégorie
3. **Ajouter** — 1 clic pour ajouter produit au panier
4. **Modifier quantités** — +/- ou saisie manuelle
5. **Encaisser** — modal paiement avec rendu automatique
6. **Boutons rapides** — ajouter rapidement au montant
7. **Vente créée** — confirmation ticket #
8. **Déconnexion**

**Contrainte:** Encaissement bloqué si admin n'a pas ouvert de session.

## 🔧 Workflow Admin

1. **Connexion** (admin / admin)
2. **Ouvrir session** — startup → caissiers peuvent encaisser
3. **Gérer produits** — CRUD
4. **Gérer caissiers** — CRUD + reset password
5. **Consulter ventes** — filtrer par date ou historique
6. **Voir détail ticket** — tous les articles
7. **Annuler vente** si nécessaire
8. **Fermer session** — end of day
9. **Historique sessions** — accès complet à toutes les sessions

## 🔄 Sessions de travail

- Admin **ouvre session** → caissiers peuvent encaisser
- Toutes les **ventes liées** à la session ouverte
- Admin **ferme session** en fin de journée
- **Impossible rouvrir** session fermée (conservée en historique)
- Admin peut **consulter ventes** d'une session quelconque

## 📦 Packaging (Windows)

```bash
npm run dist
```

Génère `dist/Caisse*.exe` — installer NSIS.

## 🛠️ Développement

### Ajouter IPC

`main/ipcHandlers.js`:
```javascript
ipcMain.handle('feature:action', (event, args) => {
  return { ok: true, data: result };
});
```

Renderer:
```javascript
const res = await window.api.invoke('feature:action', args);
```

### Modifier schéma BD

Éditer `db/migrations.sql` (appliquées auto au démarrage).

## ⚠️ Notes

- **Persistence** — BD `db/caisse.sqlite`
- **Sessions** — relancez pour recharger session active
- **PDF** — tickets sauvegardés dans `dist/`
- **Cross-platform** — Electron + sql.js (WASM) = Windows, Mac, Linux compatible

## 📄 Licence

MIT

## 👤 Support

Issues & PRs bienvenues! 🎉

## Notes
- Pour une vraie impression thermique ESC/POS, intégrez un driver/printer spécifique (USB/COM) et envoyez les commandes ESC/POS.
- Le code privilégie la simplicité pour un démarrage rapide.
