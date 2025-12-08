const dayjs = require('dayjs');
const { printTicket } = require('./printer');

module.exports = function registerIpcHandlers(ipcMain, db) {
  // Products CRUD
  ipcMain.handle('products:getAll', () => {
    const rows = db.prepare('SELECT p.id, p.name, p.price, c.name AS category FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.name').all();
    return rows;
  });

  ipcMain.handle('products:add', (event, product) => {
    const stmt = db.prepare('INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)');
    const info = stmt.run(product.name, product.price, product.category_id || null);
    return { id: info.lastInsertRowid };
  });

  ipcMain.handle('products:update', (event, product) => {
    const stmt = db.prepare('UPDATE products SET name=?, price=?, category_id=? WHERE id=?');
    stmt.run(product.name, product.price, product.category_id || null, product.id);
    return { ok: true };
  });

  ipcMain.handle('products:delete', (event, id) => {
    db.prepare('DELETE FROM products WHERE id=?').run(id);
    return { ok: true };
  });

  // Categories
  ipcMain.handle('categories:getAll', () => {
    return db.prepare('SELECT id, name FROM categories ORDER BY name').all();
  });

  // Users
  ipcMain.handle('users:login', (event, { username, password }) => {
    const user = db.prepare('SELECT id, username, role FROM users WHERE username=? AND password=?').get(username, password);
    if (!user) return { ok: false, error: 'Invalid credentials' };
    return { ok: true, user };
  });
  ipcMain.handle('users:getAll', () => {
    return db.prepare('SELECT id, username, role FROM users ORDER BY username').all();
  });

  // Sales
  ipcMain.handle('sales:create', (event, { items, cashier_id }) => {
    const now = dayjs().toISOString();
    const insertSale = db.prepare('INSERT INTO sales (total, created_at, cashier_id) VALUES (?, ?, ?)');
    const insertItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
    const productById = db.prepare('SELECT id, price FROM products WHERE id=?');

    const transaction = db.transaction(() => {
      let total = 0;
      for (const it of items) {
        const p = productById.get(it.product_id);
        const unitPrice = it.price ?? p.price;
        total += unitPrice * it.quantity;
      }
      const saleInfo = insertSale.run(total, now, cashier_id);
      const saleId = saleInfo.lastInsertRowid;
      for (const it of items) {
        const p = productById.get(it.product_id);
        const unitPrice = it.price ?? p.price;
        insertItem.run(saleId, it.product_id, it.quantity, unitPrice);
      }
      db.prepare('INSERT INTO audit (action, user_id, created_at) VALUES (?, ?, ?)').run('sale:create', cashier_id, now);
      return saleId;
    });

    const saleId = transaction();
    return { ok: true, saleId };
  });

  ipcMain.handle('sales:getByDate', (event, { from, to }) => {
    const rows = db.prepare('SELECT * FROM sales WHERE created_at BETWEEN ? AND ? ORDER BY created_at DESC').all(from, to);
    return rows;
  });

  ipcMain.handle('sales:cancel', (event, { saleId, admin_id }) => {
    // Simple cancel: delete items + sale and log audit
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM sale_items WHERE sale_id=?').run(saleId);
      db.prepare('DELETE FROM sales WHERE id=?').run(saleId);
      db.prepare('INSERT INTO audit (action, user_id, created_at) VALUES (?, ?, ?)').run('sale:cancel', admin_id, dayjs().toISOString());
    });
    tx();
    return { ok: true };
  });

  // Printing
  ipcMain.handle('printer:printTicket', async (event, saleId) => {
    const result = await printTicket(db, saleId);
    return result;
  });
};
