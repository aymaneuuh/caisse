# 📦 CAISSE SNACK - Documentation Complète du Projet

## 📋 Table des Matières
1. [Vue d'ensemble](#vue-densemble)
2. [Architecture du projet](#architecture-du-projet)
3. [Fonctionnalités implémentées](#fonctionnalités-implémentées)
4. [Détails techniques](#détails-techniques)
5. [Historique complet des développements](#historique-complet-des-développements)
6. [Ce qui reste à faire](#ce-qui-reste-à-faire)

---

## 🎯 Vue d'ensemble

**Caisse Snack** est une application de caisse enregistreuse professionnelle développée avec Electron, conçue pour les restaurants et snack bars. L'application permet la gestion complète des ventes, des produits, des utilisateurs et des sessions de travail.

### Technologies utilisées
- **Electron** : Framework pour application desktop
- **SQL.js** : Base de données SQLite en mémoire avec persistance fichier
- **PDFKit** : Génération de tickets de caisse PDF
- **Day.js** : Gestion des dates
- **bcryptjs** : Hachage sécurisé des mots de passe
- **HTML/CSS/JavaScript** : Interface utilisateur

---

## 🏗️ Architecture du projet

```
caisse/
├── main/                          # Processus principal Electron
│   ├── main.js                    # Point d'entrée, création fenêtre
│   ├── db.js                      # API base de données SQL.js
│   ├── ipcHandlers.js             # Handlers IPC (auth, users, products, sales, sessions, config)
│   ├── printer.js                 # Génération tickets PDF professionnels
│   └── utils/
│       └── preload.js             # Contexte bridge IPC sécurisé
├── renderer/                      # Pages frontend
│   ├── login.html / login.js      # Page de connexion (admin/caissier)
│   ├── index.html / app.js        # Interface caisse (POS)
│   ├── admin.html / admin.js      # Panel d'administration
│   ├── session-sales.html / session-sales.js  # Ventes par session
│   └── styles.css                 # Styles globaux (design épuré blanc/gris)
├── db/                            # Base de données
│   ├── migrations.sql             # Schéma BD (users, products, categories, sales, sessions, config)
│   └── seed.sql                   # Données initiales (admin, caissiers, produits)
├── dist/                          # Tickets PDF générés
├── assets/                        # Ressources (logo)
├── package.json                   # Dépendances et scripts
├── electron-builder.yml           # Configuration build
└── .gitignore                     # Fichiers ignorés Git

```

---

## ✅ Fonctionnalités implémentées

### 🔐 Authentification & Autorisation
- [x] **Deux rôles** : Admin et Caissier
- [x] **Deux modes de connexion caissier** (configurable par admin) :
  - **Mode mot de passe** : Chaque caissier entre username + password
  - **Mode sélection** : Dropdown pour choisir un caissier (sans mot de passe)
- [x] **Hachage sécurisé** des mots de passe avec bcryptjs
- [x] **Migration automatique** des mots de passe en clair vers hash
- [x] **Session persistante** : garde l'utilisateur connecté
- [x] **Déconnexion** : bouton Logout sur toutes les pages
- [x] **Redirection automatique** selon le rôle (admin → admin.html, caissier → index.html)

### 🛒 Interface Caisse (POS)
- [x] **Catalogue produits** avec recherche en temps réel
- [x] **Filtrage par catégorie** (dropdown)
- [x] **Panier dynamique** :
  - Ajout/suppression produits
  - Modification quantité (boutons +/- et input direct)
  - Calcul total automatique
  - Bouton "Vider le panier"
- [x] **Scrolling activé** : gestion des longs catalogues/paniers
- [x] **Responsive** : orientation portrait/paysage

### 💰 Encaissement & Paiement
- [x] **Modal de paiement** au checkout :
  - Choix **Espèces** ou **Carte bancaire**
  - Pour espèces :
    - Input montant remis
    - Calcul automatique du rendu de monnaie
    - Boutons rapides : Exact, +0.50€, +1€, +2€, +5€, +10€
  - Validation montant suffisant (refuse si < total)
- [x] **Enregistrement vente** :
  - Items avec quantités et prix unitaires
  - Total calculé
  - Caissier lié (ID récupéré de la session)
  - Session de travail liée (auto-ouverte si nécessaire)
  - Mode de paiement (cash/card)
  - Montant remis et change (pour espèces)
- [x] **Impression automatique** du ticket après encaissement

### 🖨️ Tickets de caisse
- [x] **Format professionnel thermique 58mm**
- [x] **En-tête** :
  - Nom établissement "CAISSE SNACK"
  - Adresse, téléphone, SIRET
- [x] **Corps** :
  - Numéro de ticket
  - Date et heure (format DD/MM/YYYY à HH:mm)
  - Nom du caissier
  - Tableau aligné : QTÉ | ARTICLE | P.U. | TOTAL
- [x] **Pied** :
  - Total en gras
  - Message "Merci de votre visite !"
  - Mention légale TVA
- [x] **Export PDF** dans dossier `dist/`
- [x] **Colonnes correctement alignées et centrées**

### 🔧 Administration
- [x] **Gestion Produits** :
  - Créer, modifier, supprimer produits
  - Nom, prix, catégorie
  - Validation prix > 0
- [x] **Gestion Catégories** :
  - Créer, modifier, supprimer catégories
  - Protection : empêche suppression catégorie avec produits
- [x] **Gestion Utilisateurs** :
  - Créer, modifier, supprimer utilisateurs
  - Rôles : admin ou cashier
  - Réinitialisation mot de passe
  - Protection : empêche suppression compte admin
- [x] **Gestion Sessions de travail** :
  - Ouvrir session manuellement
  - **Auto-ouverture** au premier ticket si aucune session ouverte
  - Fermer session
  - Voir historique sessions (date ouverture/fermeture, caissier)
  - Voir toutes les ventes d'une session
- [x] **Ventes & Statistiques** :
  - Liste ventes par période (date de/à)
  - Détail de chaque vente (produits, quantités, prix)
  - Annulation vente (admin seulement)
  - Ventes par session (avec fallback temporel si session_id null)
- [x] **Configuration** :
  - Toggle mode authentification caissier (password/select)
  - Sauvegarde config en base

### 📊 Base de données
- [x] **Tables** :
  - `users` : id, username, password (hash), role
  - `categories` : id, name
  - `products` : id, name, price, category_id
  - `sales` : id, total, created_at, cashier_id, session_id
  - `sale_items` : id, sale_id, product_id, quantity, price
  - `sessions` : id, opened_by, opened_at, closed_at
  - `config` : key/value (ex: cashier_auth_mode)
  - `audit` : id, action, user_id, created_at (logs actions)
- [x] **Clés étrangères** et contraintes d'intégrité
- [x] **Migrations** automatiques au démarrage
- [x] **Seed data** : admin, 2 caissiers, 4 catégories, 12 produits

### 🎨 Interface Utilisateur
- [x] **Design épuré** : palette blanc/gris (fini le style néon)
- [x] **Boutons colorés** par fonction :
  - Primaire (bleu) : actions principales
  - Succès (vert) : validation
  - Danger (rouge) : suppression
  - Warning (orange) : attention
  - Secondary (gris) : annulation
- [x] **Modales** pour :
  - Création/édition produit/catégorie/utilisateur
  - Paiement (checkout)
  - Détail ticket
- [x] **Tables admin** propres avec actions inline
- [x] **Scrolling** fonctionnel partout
- [x] **Messages de statut** en temps réel

---

## 🔍 Détails techniques

### Gestion de la base de données
- **SQL.js** : SQLite en mémoire, export périodique vers fichier `db/caisse.sqlite`
- **Transactions** : opérations atomiques (ventes, annulations)
- **Persistance** : `persist()` appelé après chaque write
- **API custom** : `db.all()`, `db.get()`, `db.run()`, `db.transaction()`

### IPC (Inter-Process Communication)
Tous les handlers exposés via `window.api.invoke()` :

**Auth**
- `auth:login` : connexion username/password
- `auth:selectCashier` : connexion mode sélection
- `auth:logout` : déconnexion
- `auth:getSession` : récupérer session active

**Config**
- `config:getCashierAuthMode` : récupérer mode (password/select)
- `config:setCashierAuthMode` : changer mode (admin)

**Users**
- `users:getAll` : tous utilisateurs
- `users:getAllCashiers` : caissiers seulement (pour dropdown)
- `users:create` : créer utilisateur
- `users:update` : modifier utilisateur
- `users:resetPassword` : réinitialiser mot de passe
- `users:delete` : supprimer utilisateur

**Products**
- `products:getAll` : tous produits
- `products:create` : créer produit
- `products:update` : modifier produit
- `products:delete` : supprimer produit

**Categories**
- `categories:getAll` : toutes catégories
- `categories:create` : créer catégorie
- `categories:update` : modifier catégorie
- `categories:delete` : supprimer catégorie

**Sales**
- `sales:create` : créer vente (avec auto-ouverture session)
- `sales:getAll` : toutes ventes
- `sales:getByDate` : ventes par période
- `sales:getDetail` : détail vente
- `sales:cancel` : annuler vente (admin)

**Work Sessions**
- `workSession:getCurrent` : session ouverte actuelle
- `workSession:open` : ouvrir session (admin)
- `workSession:close` : fermer session (admin)
- `workSession:list` : historique sessions
- `workSession:getSales` : ventes d'une session (union session_id + fenêtre temporelle)

**Printing**
- `printer:printTicket` : générer PDF ticket

### Sécurité
- **Hachage bcrypt** : tous mots de passe stockés en hash
- **Validation admin** : `requireAdmin()` pour actions sensibles
- **Contexte isolé** : preload.js expose seulement API nécessaire
- **Validation inputs** : prix > 0, quantités > 0, champs requis

### Auto-ouverture session
Lors de la création d'une vente (`sales:create`) :
1. Vérifie si session ouverte (`currentWorkSessionId`)
2. Si aucune : crée automatiquement une session avec `opened_by = cashier_id`
3. Audit log : `session:auto_open`
4. Enregistre vente avec `session_id`

---

## 📜 Historique complet des développements

### Phase 1 : Setup initial
1. **Structure Electron** : main.js, preload.js, fenêtre 1200x800
2. **Base de données** : SQL.js avec migrations.sql et seed.sql
3. **Schema BD** : tables users, products, categories, sales, sale_items
4. **Authentification basique** : login admin/caissier

### Phase 2 : Interface caisse
1. **Page POS** (index.html) : catalogue produits, recherche, filtrage catégorie
2. **Panier dynamique** : ajout/suppression, modification quantité
3. **Calcul total** temps réel
4. **Bouton checkout** : création vente basique

### Phase 3 : Administration
1. **Page admin** (admin.html) : CRUD produits, catégories, utilisateurs
2. **Validation** : empêche suppression admin, catégorie avec produits
3. **Gestion ventes** : liste, détail, annulation
4. **Filtrage ventes** par date

### Phase 4 : UI/UX améliorations
1. **Design épuré** : palette blanc/gris, suppression style néon
2. **Boutons colorés** par fonction
3. **Scrolling** : layout flex, overflow-y auto
4. **Orientation** : meta viewport ajusté
5. **Modales** : création/édition/détail

### Phase 5 : Sessions de travail
1. **Table sessions** : opened_by, opened_at, closed_at
2. **Handlers admin** : open/close session manuelle
3. **Lien sales** : colonne session_id
4. **Historique sessions** : liste, ventes par session
5. **Auto-ouverture** : premier ticket ouvre session si aucune

### Phase 6 : Modes authentification caissier
1. **Table config** : stockage key/value
2. **Config cashier_auth_mode** : password ou select
3. **Login adaptatif** : bascule password/dropdown selon mode
4. **Handler getAllCashiers** : populate dropdown
5. **Toggle admin** : bouton changer mode

### Phase 7 : Paiement avancé
1. **Modal checkout** : remplacement du bouton direct
2. **Choix paiement** : espèces ou carte
3. **Input espèces** : montant remis, calcul change automatique
4. **Boutons rapides** : Exact, +0.50€, +1€, +2€, +5€, +10€
5. **Validation** : refuse si montant insuffisant
6. **Enregistrement** : payment_method, cash_received, change dans payload

### Phase 8 : Impression tickets
1. **Module printer.js** : génération PDF avec PDFKit
2. **Format thermique 58mm** : taille adaptée imprimantes caisse
3. **Layout professionnel** :
   - En-tête : établissement, adresse, SIRET
   - Corps : ticket#, date, caissier, tableau articles
   - Pied : total, remerciement, mention TVA
4. **Auto-print** : appel `printer:printTicket` après checkout
5. **Export dist/** : fichiers ticket-{id}.pdf
6. **Alignement colonnes** : QTÉ, ARTICLE, P.U., TOTAL centrés

### Phase 9 : Corrections & finitions
1. **Fix dropdown caissiers** : handler getAllCashiers public
2. **Fix scrolling** : body/layout flex + overflow
3. **Fix orientation** : meta viewport permissif
4. **Fix ventes sessions** : union session_id + fenêtre temporelle
5. **Fix auto-session** : validation cashier_id, panier vide
6. **Fix ticket centering** : colonnes alignées avec width explicite

---

## 🚀 Ce qui reste à faire

### Fonctionnalités métier
- [ ] **Stock** : gestion inventaire, alertes rupture
- [ ] **Promotions** : réductions, offres spéciales
- [ ] **Clients** : programme fidélité, historique achats
- [ ] **Statistiques avancées** :
  - Top produits vendus
  - CA par période/caissier/catégorie
  - Graphiques (charts)
- [ ] **TVA** : calcul et affichage TVA par taux
- [ ] **Factures** : génération factures clients pro
- [ ] **Moyens de paiement** : chèque, ticket restaurant, mobile

### Technique
- [ ] **Impression physique** : intégration imprimante thermique ESC/POS
- [ ] **Backup automatique** : export régulier BD
- [ ] **Multi-caisses** : synchronisation réseau
- [ ] **Cloud** : sauvegarde en ligne
- [ ] **API REST** : exposition données pour intégrations
- [ ] **Webhooks** : notifications externe (Discord, Slack)

### UI/UX
- [ ] **Raccourcis clavier** : navigation rapide caisse
- [ ] **Scanner code-barre** : support lecteur
- [ ] **Affichage client** : écran secondaire pour total
- [ ] **Mode nuit** : thème sombre
- [ ] **Langues** : internationalisation (FR/EN)
- [ ] **Accessibilité** : ARIA, navigation clavier

### Admin
- [ ] **Dashboard** : vue d'ensemble KPIs
- [ ] **Export données** : CSV, Excel
- [ ] **Logs audit** : traçabilité complète actions
- [ ] **Permissions** : rôles personnalisés (manager, comptable)
- [ ] **Sauvegarde/restauration** : interface admin

### Sécurité
- [ ] **2FA** : double authentification admin
- [ ] **Timeout session** : déconnexion auto inactivité
- [ ] **Chiffrement** : données sensibles en BD
- [ ] **Updates auto** : vérification mises à jour

### Performance
- [ ] **Pagination** : liste ventes/produits longues
- [ ] **Index BD** : optimisation requêtes
- [ ] **Cache** : produits en mémoire
- [ ] **Lazy loading** : images produits

### Documentation
- [ ] **Manuel utilisateur** : guide PDF
- [ ] **Vidéos tutoriels** : formation caissiers
- [ ] **API docs** : documentation technique
- [ ] **Changelog** : historique versions

---

## 📦 Installation & Lancement

### Prérequis
- Node.js 16+
- npm

### Installation
```bash
cd caisse
npm install
```

### Développement
```bash
npm start
```

### Build production
```bash
npm run build
```

### Structure fichiers générés
```
caisse/
├── db/
│   └── caisse.sqlite          # Base de données (généré au runtime)
├── dist/
│   └── ticket-*.pdf           # Tickets générés
└── dist-electron/             # Build Electron (après npm run build)
```

---

## 👥 Utilisateurs par défaut (seed.sql)

| Username | Password | Rôle     |
|----------|----------|----------|
| admin    | admin123 | admin    |
| caisse1  | 1234     | cashier  |
| caisse2  | 1234     | cashier  |

---

## 📝 Notes importantes

1. **Sécurité** : Changez les mots de passe par défaut en production
2. **Backup** : Sauvegardez régulièrement `db/caisse.sqlite`
3. **Tickets** : Vérifiez format impression avec imprimante physique
4. **Config** : Mode authentification caissier modifiable depuis admin
5. **Sessions** : Première vente ouvre automatiquement une session
6. **Audit** : Toutes actions critiques loguées dans table `audit`

---

## 🐛 Bugs connus résolus

- ✅ Dropdown caissiers vide (mode select) → handler getAllCashiers ajouté
- ✅ Scrolling bloqué → layout flex + overflow
- ✅ Ventes sessions invisibles → union session_id + fenêtre temporelle
- ✅ Tickets mal alignés → colonnes avec width explicite
- ✅ Session required pour vente → auto-ouverture implémentée

---

## 🎉 Conclusion

Le projet **Caisse Snack** est une application POS complète et fonctionnelle, prête pour un usage réel dans un petit commerce. L'architecture est solide, extensible, et suit les bonnes pratiques Electron.

**Points forts** :
- Interface intuitive et responsive
- Gestion complète ventes/produits/utilisateurs
- Système de sessions robuste
- Tickets professionnels auto-imprimés
- Sécurité (hash passwords, validation admin)
- Code propre et commenté

**Prochaines étapes recommandées** :
1. Tester en conditions réelles
2. Implémenter gestion stock
3. Ajouter statistiques avancées
4. Intégrer imprimante thermique
5. Setup backup automatique

---

**Développé avec ❤️ pour les snacks et restaurants**
