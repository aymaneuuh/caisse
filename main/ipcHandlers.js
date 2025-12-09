const dayjs = require('dayjs');
const bcrypt = require('bcryptjs');
const { printTicket } = require('./printer');

module.exports = function registerIpcHandlers(ipcMain, db) {
  let session = { user: null };
  let currentWorkSessionId = null; // admin-opened session id

  // Initialize current session from DB if one is open (closed_at IS NULL)
  try {
    const open = db.get('SELECT id FROM sessions WHERE closed_at IS NULL ORDER BY id DESC');
    if (open && open.id) currentWorkSessionId = open.id;
  } catch (e) {
    // sessions table may not exist yet on first run; ignore
  }

  function isHashed(pw) { return typeof pw === 'string' && pw.startsWith('$2'); }
  function requireAdmin() {
    if (!session.user || session.user.role !== 'admin') {
      const err = new Error('Forbidden: admin only');
      err.code = 'FORBIDDEN';
      throw err;
    }
  }

  // Auth
  ipcMain.handle('auth:getSession', () => {
    return { ok: true, user: session.user };
  });
  ipcMain.handle('auth:logout', () => {
    session.user = null;
    return { ok: true };
  });
  ipcMain.handle('auth:login', (event, { username, password }) => {
    const row = db.get('SELECT id, username, password, role FROM users WHERE username=?', [username]);
    if (!row) return { ok: false, error: 'Utilisateur introuvable' };
    const stored = row.password;
    let match = false;
    if (isHashed(stored)) {
      match = bcrypt.compareSync(password, stored);
    } else {
      // migrate plaintext to hash on-the-fly
      match = stored === password;
      if (match) {
        const hash = bcrypt.hashSync(password, 10);
        db.run('UPDATE users SET password=? WHERE id=?', [hash, row.id]);
      }
    }
    if (!match) return { ok: false, error: 'Mot de passe invalide' };
    session.user = { id: row.id, username: row.username, role: row.role };
    return { ok: true, user: session.user };
  });
  // Products CRUD
  ipcMain.handle('products:getAll', () => {
    return db.all('SELECT p.id, p.name, p.price, p.category_id, c.name AS category FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.name');
  });

  ipcMain.handle('products:add', (event, product) => {
    requireAdmin();
    db.run('INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)', [product.name, product.price, product.category_id || null]);
    const row = db.get('SELECT last_insert_rowid() as id');
    return { id: row.id };
  });

  ipcMain.handle('products:update', (event, product) => {
    requireAdmin();
    db.run('UPDATE products SET name=?, price=?, category_id=? WHERE id=?', [product.name, product.price, product.category_id || null, product.id]);
    return { ok: true };
  });

  ipcMain.handle('products:delete', (event, id) => {
    requireAdmin();
    db.run('DELETE FROM products WHERE id=?', [id]);
    return { ok: true };
  });

  // Categories
  ipcMain.handle('categories:getAll', () => {
    return db.all('SELECT id, name FROM categories ORDER BY name');
  });

  // Users
  ipcMain.handle('users:login', (event, { username, password }) => {
    const user = db.get('SELECT id, username, role FROM users WHERE username=? AND password=?', [username, password]);
    if (!user) return { ok: false, error: 'Invalid credentials' };
    return { ok: true, user };
  });
  ipcMain.handle('users:getAll', () => {
    return db.all('SELECT id, username, role FROM users ORDER BY username');
  });
  ipcMain.handle('users:add', (event, { username, password, role }) => {
    requireAdmin();
    const uname = (username||'').trim();
    const pw = password||'';
    const r = (role||'cashier').trim();
    if (!uname || uname.length < 3) return { ok: false, error: 'Nom utilisateur trop court' };
    if (!pw || pw.length < 3) return { ok: false, error: 'Mot de passe trop court' };
    const exists = db.get('SELECT id FROM users WHERE username=?', [uname]);
    if (exists) return { ok: false, error: 'Nom utilisateur déjà pris' };
    const hash = bcrypt.hashSync(pw, 10);
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [uname, hash, r]);
    const id = db.get('SELECT last_insert_rowid() as id').id;
    return { ok: true, user: { id, username: uname, role: r } };
  });
  ipcMain.handle('users:resetPassword', (event, { userId, newPassword }) => {
    requireAdmin();
    const uid = Number(userId);
    const pw = newPassword||'';
    if (!uid) return { ok: false, error: 'Utilisateur invalide' };
    if (!pw || pw.length < 3) return { ok: false, error: 'Mot de passe trop court' };
    const exists = db.get('SELECT id FROM users WHERE id=?', [uid]);
    if (!exists) return { ok: false, error: 'Utilisateur introuvable' };
    const hash = bcrypt.hashSync(pw, 10);
    db.run('UPDATE users SET password=? WHERE id=?', [hash, uid]);
    return { ok: true };
  });
  ipcMain.handle('users:delete', (event, { userId }) => {
    requireAdmin();
    const uid = Number(userId);
    if (!uid) return { ok: false, error: 'Utilisateur invalide' };
    const u = db.get('SELECT id, role FROM users WHERE id=?', [uid]);
    if (!u) return { ok: false, error: 'Utilisateur introuvable' };
    if (u.role === 'admin') return { ok: false, error: "Impossible de supprimer l'admin" };
    db.run('DELETE FROM users WHERE id=?', [uid]);
    return { ok: true };
  });

  // Sales
  ipcMain.handle('sales:create', (event, { items, cashier_id }) => {
    if (!currentWorkSessionId) {
      return { ok: false, error: 'Aucune session ouverte. Contactez un administrateur.' };
    }
    const now = dayjs().toISOString();
    const saleId = db.transaction(() => {
      let total = 0;
      for (const it of items) {
        const p = db.get('SELECT id, price FROM products WHERE id=?', [it.product_id]);
        const unitPrice = it.price ?? p.price;
        total += unitPrice * it.quantity;
      }
      db.run('INSERT INTO sales (total, created_at, cashier_id, session_id) VALUES (?, ?, ?, ?)', [total, now, cashier_id, currentWorkSessionId]);
      const saleId = db.get('SELECT last_insert_rowid() as id').id;
      for (const it of items) {
        const p = db.get('SELECT id, price FROM products WHERE id=?', [it.product_id]);
        const unitPrice = it.price ?? p.price;
        db.run('INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [saleId, it.product_id, it.quantity, unitPrice]);
      }
      db.run('INSERT INTO audit (action, user_id, created_at) VALUES (?, ?, ?)', ['sale:create', cashier_id, now]);
      return saleId;
    });
    return { ok: true, saleId };
  });

  ipcMain.handle('sales:getByDate', (event, { from, to }) => {
    return db.all('SELECT * FROM sales WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC', [from, to]);
  });
  ipcMain.handle('sales:getAll', () => {
    return db.all('SELECT * FROM sales ORDER BY created_at DESC');
  });
  ipcMain.handle('sales:getDetail', (event, saleId) => {
    const sale = db.get('SELECT * FROM sales WHERE id=?', [saleId]);
    if (!sale) return { ok: false, error: 'Vente introuvable' };
    const items = db.all('SELECT si.quantity, si.price, p.name FROM sale_items si JOIN products p ON p.id=si.product_id WHERE si.sale_id=?', [saleId]);
    return { ok: true, sale, items };
  });

  ipcMain.handle('sales:cancel', (event, { saleId, admin_id }) => {
    requireAdmin();
    // Simple cancel: delete items + sale and log audit
    db.transaction(() => {
      db.run('DELETE FROM sale_items WHERE sale_id=?', [saleId]);
      db.run('DELETE FROM sales WHERE id=?', [saleId]);
      db.run('INSERT INTO audit (action, user_id, created_at) VALUES (?, ?, ?)', ['sale:cancel', admin_id, dayjs().toISOString()]);
    });
    return { ok: true };
  });

  // Printing
  ipcMain.handle('printer:printTicket', async (event, saleId) => {
    const result = await printTicket(db, saleId);
    return result;
  });

  // Work sessions (admin open/close)
  ipcMain.handle('workSession:getCurrent', () => {
    // Check DB for any open session (closed_at IS NULL)
    const open = db.get('SELECT * FROM sessions WHERE closed_at IS NULL ORDER BY id DESC');
    if (open && open.id) {
      currentWorkSessionId = open.id; // sync memory
      return { ok: true, session: open };
    }
    currentWorkSessionId = null;
    return { ok: true, session: null };
  });
  ipcMain.handle('workSession:open', (event) => {
    requireAdmin();
    // Check DB for any lingering open session
    const openDb = db.get('SELECT id FROM sessions WHERE closed_at IS NULL ORDER BY id DESC');
    if (openDb && openDb.id) {
      currentWorkSessionId = openDb.id;
      return { ok: false, error: `Session déjà ouverte (#${openDb.id})` };
    }
    if (currentWorkSessionId) {
      const s = db.get('SELECT * FROM sessions WHERE id=?', [currentWorkSessionId]);
      return { ok: false, error: `Session déjà ouverte (#${s.id})` };
    }
    const now = dayjs().toISOString();
    db.run('INSERT INTO sessions (opened_by, opened_at) VALUES (?, ?)', [session.user.id, now]);
    currentWorkSessionId = db.get('SELECT last_insert_rowid() as id').id;
    db.run('INSERT INTO audit (action, user_id, created_at) VALUES (?, ?, ?)', ['session:open', session.user.id, now]);
    return { ok: true, sessionId: currentWorkSessionId };
  });
  ipcMain.handle('workSession:close', () => {
    requireAdmin();
    if (!currentWorkSessionId) {
      // Try to find any open session in DB and close it
      const openDb = db.get('SELECT id FROM sessions WHERE closed_at IS NULL ORDER BY id DESC');
      if (openDb && openDb.id) {
        currentWorkSessionId = openDb.id;
      } else {
        return { ok: false, error: 'Aucune session ouverte' };
      }
    }
    const now = dayjs().toISOString();
    db.run('UPDATE sessions SET closed_at=? WHERE id=?', [now, currentWorkSessionId]);
    db.run('INSERT INTO audit (action, user_id, created_at) VALUES (?, ?, ?)', ['session:close', session.user.id, now]);
    currentWorkSessionId = null;
    return { ok: true };
  });
  ipcMain.handle('workSession:list', () => {
    return db.all('SELECT * FROM sessions ORDER BY opened_at DESC');
  });
  ipcMain.handle('workSession:getSales', (event, sessionId) => {
    return db.all('SELECT * FROM sales WHERE session_id=? ORDER BY created_at DESC', [sessionId]);
  });
};
