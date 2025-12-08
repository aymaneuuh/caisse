const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'db', 'caisse.sqlite');
const migrationsPath = path.join(process.cwd(), 'db', 'migrations.sql');
const seedPath = path.join(process.cwd(), 'db', 'seed.sql');

function getDb() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  return db;
}

async function applyMigrationsAndSeed(db) {
  // Simple migrations runner (idempotent via IF NOT EXISTS and UPSERTs in seed)
  const migrationsSql = fs.readFileSync(migrationsPath, 'utf-8');
  db.exec(migrationsSql);

  const seedSql = fs.readFileSync(seedPath, 'utf-8');
  db.exec(seedSql);
}

module.exports = { getDb, applyMigrationsAndSeed };
