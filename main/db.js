const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const dbDir = path.join(process.cwd(), 'db');
const dbPath = path.join(dbDir, 'caisse.sqlite');
const migrationsPath = path.join(dbDir, 'migrations.sql');
const seedPath = path.join(dbDir, 'seed.sql');

let SQL = null;
let DB = null;
let transactionDepth = 0;

async function getDb() {
  if (!SQL) {
    SQL = await initSqlJs({});
  }
  if (!DB) {
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      DB = new SQL.Database(new Uint8Array(fileBuffer));
    } else {
      DB = new SQL.Database();
    }
  }
  return createApi(DB);
}

function persist() {
  const data = DB.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function runScript(sql) {
  DB.exec(sql);
}

async function applyMigrationsAndSeed() {
  const migrationsSql = fs.readFileSync(migrationsPath, 'utf-8');
  runScript(migrationsSql);
  const seedSql = fs.readFileSync(seedPath, 'utf-8');
  runScript(seedSql);
  persist();
}

function createApi(db) {
  return {
    all(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    },
    get(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const row = stmt.step() ? stmt.getAsObject() : undefined;
      stmt.free();
      return row;
    },
    run(sql, params = []) {
      const stmt = db.prepare(sql);
      stmt.run(params);
      stmt.free();
      if (transactionDepth === 0) {
        persist();
      }
      return { ok: true };
    },
    transaction(fn) {
      try {
        if (transactionDepth === 0) {
          db.exec('BEGIN TRANSACTION');
        }
        transactionDepth++;
        const result = fn();
        transactionDepth--;
        if (transactionDepth === 0) {
          db.exec('COMMIT');
          persist();
        }
        return result;
      } catch (e) {
        try {
          if (transactionDepth > 0) {
            transactionDepth--;
          }
          if (transactionDepth === 0) {
            db.exec('ROLLBACK');
          }
        } catch (_) {}
        throw e;
      }
    }
  };
}

module.exports = { getDb, applyMigrationsAndSeed };
