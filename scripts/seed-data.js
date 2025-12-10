const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../db/caisse.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

try {
  // Add test categories
  const categories = [
    { name: 'Sandwichs' },
    { name: 'Pizzas' },
    { name: 'Boissons' },
    { name: 'Desserts' }
  ];

  for (const cat of categories) {
    db.exec(`INSERT OR IGNORE INTO categories (name) VALUES ('${cat.name}')`);
  }

  // Get category IDs
  const sandwichCat = db.prepare('SELECT id FROM categories WHERE name=?').get('Sandwichs');
  const pizzaCat = db.prepare('SELECT id FROM categories WHERE name=?').get('Pizzas');

  // Add customizable products
  const products = [
    { name: 'Sandwich Poulet', price: 7.50, category_id: sandwichCat.id, can_customize: 1 },
    { name: 'Sandwich Fromage', price: 6.50, category_id: sandwichCat.id, can_customize: 1 },
    { name: 'Pizza Margherita', price: 10.00, category_id: pizzaCat.id, can_customize: 1 },
    { name: 'Pizza 4 Fromages', price: 11.50, category_id: pizzaCat.id, can_customize: 1 }
  ];

  for (const prod of products) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO products (name, price, category_id, can_customize) 
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(prod.name, prod.price, prod.category_id, prod.can_customize);
  }

  // Get product IDs
  const sandwichPoulet = db.prepare('SELECT id FROM products WHERE name=?').get('Sandwich Poulet');
  const pizzaMarg = db.prepare('SELECT id FROM products WHERE name=?').get('Pizza Margherita');

  // Add ingredients for Sandwich Poulet
  if (sandwichPoulet) {
    const ingredients = ['Laitue', 'Tomate', 'Oignon', 'Sauce'];
    for (const ing of ingredients) {
      db.exec(`
        INSERT OR IGNORE INTO ingredients (product_id, name, selected) 
        VALUES (${sandwichPoulet.id}, '${ing}', 1)
      `);
    }
  }

  // Add supplements for Sandwich
  if (sandwichPoulet) {
    const supplements = [
      { name: 'Bacon', price: 1.50 },
      { name: 'Extra Fromage', price: 1.00 },
      { name: 'Mayonnaise', price: 0.50 }
    ];
    for (const sup of supplements) {
      db.exec(`
        INSERT OR IGNORE INTO supplements (product_id, name, price) 
        VALUES (${sandwichPoulet.id}, '${sup.name}', ${sup.price})
      `);
    }
  }

  // Add ingredients for Pizza Margherita
  if (pizzaMarg) {
    const ingredients = ['Tomate', 'Mozzarella', 'Basilic', 'Olive'];
    for (const ing of ingredients) {
      db.exec(`
        INSERT OR IGNORE INTO ingredients (product_id, name, selected) 
        VALUES (${pizzaMarg.id}, '${ing}', 1)
      `);
    }
  }

  // Add supplements for Pizza
  if (pizzaMarg) {
    const supplements = [
      { name: 'Pepperoni', price: 2.00 },
      { name: 'Champignons', price: 1.50 },
      { name: 'Oignons rouges', price: 1.00 }
    ];
    for (const sup of supplements) {
      db.exec(`
        INSERT OR IGNORE INTO supplements (product_id, name, price) 
        VALUES (${pizzaMarg.id}, '${sup.name}', ${sup.price})
      `);
    }
  }

  console.log('✅ Données de test ajoutées avec succès');
} catch (e) {
  console.error('❌ Erreur:', e.message);
}

db.close();
