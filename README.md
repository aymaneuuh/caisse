# Caisse Snack — Electron.js + SQLite

Application de caisse minimale pour snack, fonctionnelle sous Windows.

## Prérequis
- Node.js (LTS) installé
- Windows 10/11

## Installation et démarrage
```powershell
npm install
npm start
```
- Au premier démarrage, la base SQLite est créée dans `db/caisse.sqlite`, migrations et seed sont appliqués.
- Dans la fenêtre, utilisez le bouton "Charger les produits" pour tester l'IPC.
- Créez une vente test puis imprimez le ticket.

## Build (Windows)
```powershell
npm run dist
```
Génère un installeur `.exe` (NSIS) dans `dist/`.

## Fonctionnalités
- SQLite local via `sql.js` (WebAssembly, no native build required)
- IPC CRUD: produits, catégories, ventes, utilisateurs
- Impression ticket PDF via PDFKit + génération HTML (placeholder ESC/POS)
- UI minimale HTML/CSS/JS
- Seed auto (2 utilisateurs, 5 catégories, 20 produits)

## Structure
```
project-root/
├── main/
│   ├── main.js
│   ├── db.js
│   ├── ipcHandlers.js
│   ├── printer.js
│   └── utils/preload.js
├── renderer/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── db/
│   ├── migrations.sql
│   └── seed.sql
├── assets/
├── package.json
├── electron-builder.yml
└── README.md
```

## Notes
- Pour une vraie impression thermique ESC/POS, intégrez un driver/printer spécifique (USB/COM) et envoyez les commandes ESC/POS.
- Le code privilégie la simplicité pour un démarrage rapide.
