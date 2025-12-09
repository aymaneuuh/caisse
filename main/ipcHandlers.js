const dayjs = require('dayjs');
const bcrypt = require('bcryptjs');
const { printTicket } = require('./printer');

module.exports = function registerIpcHandlers(ipcMain, db) {
  let session = { user: null };

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

  // Sales
  ipcMain.handle('sales:create', (event, { items, cashier_id }) => {
    const now = dayjs().toISOString();
    const saleId = db.transaction(() => {
      let total = 0;
      for (const it of items) {
        const p = db.get('SELECT id, price FROM products WHERE id=?', [it.product_id]);
        const unitPrice = it.price ?? p.price;
        total += unitPrice * it.quantity;
      }
      db.run('INSERT INTO sales (total, created_at, cashier_id) VALUES (?, ?, ?)', [total, now, cashier_id]);
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
};
