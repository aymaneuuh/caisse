PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL,
  category_id INTEGER,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total REAL NOT NULL,
  created_at TEXT NOT NULL,
  cashier_id INTEGER NOT NULL,
  session_id INTEGER,
  payment_method TEXT DEFAULT 'cash',
  cash_received REAL,
  change REAL,
  FOREIGN KEY (cashier_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  note TEXT,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  user_id INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Admin sessions (workday sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opened_by INTEGER NOT NULL,
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  FOREIGN KEY (opened_by) REFERENCES users(id)
);

-- Configuration (app settings)
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Initialize default config if not exists
INSERT OR IGNORE INTO config (key, value) VALUES ('cashier_auth_mode', 'password');

-- Seed categories
INSERT OR IGNORE INTO categories (id, name) VALUES (1, 'Plats');
INSERT OR IGNORE INTO categories (id, name) VALUES (2, 'Boissons');
INSERT OR IGNORE INTO categories (id, name) VALUES (3, 'Desserts');
INSERT OR IGNORE INTO categories (id, name) VALUES (4, 'Suppléments');

-- Seed products
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (1, 'Pizza Margherita', 9.50, 1);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (2, 'Burger Classic', 8.00, 1);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (3, 'Tacos Poulet', 7.50, 1);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (4, 'Salade César', 6.50, 1);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (5, 'Coca-Cola', 2.50, 2);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (6, 'Eau Minérale', 1.50, 2);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (7, 'Jus d''Orange', 3.00, 2);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (8, 'Tiramisu', 4.50, 3);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (9, 'Tarte Citron', 4.00, 3);

-- Seed supplements (category 4)
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (20, 'Fromage Supplémentaire', 1.50, 4);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (21, 'Sauce Barbecue', 0.50, 4);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (22, 'Sauce Algérienne', 0.50, 4);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (23, 'Sauce Samourai', 0.50, 4);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (24, 'Bacon', 1.00, 4);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (25, 'Œuf', 1.00, 4);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (26, 'Avocat', 1.50, 4);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (27, 'Cornichons', 0.50, 4);
INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES (28, 'Oignons Frits', 0.75, 4);

-- Seed default user
INSERT OR IGNORE INTO users (id, username, password, role) VALUES (1, 'admin', 'admin', 'admin');
INSERT OR IGNORE INTO users (id, username, password, role) VALUES (2, 'caissier', 'caissier', 'cashier');
