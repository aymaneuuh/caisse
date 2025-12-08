INSERT OR IGNORE INTO users (id, username, password, role) VALUES
  (1, 'admin', 'admin', 'admin'),
  (2, 'caissier', 'test', 'cashier');

INSERT OR IGNORE INTO categories (id, name) VALUES
  (1, 'Boissons'),
  (2, 'Snacks'),
  (3, 'Sandwichs'),
  (4, 'Desserts'),
  (5, 'Divers');

INSERT OR IGNORE INTO products (id, name, price, category_id) VALUES
  (1,'Eau 50cl',1.00,1),
  (2,'Soda 33cl',2.00,1),
  (3,'Jus 25cl',2.50,1),
  (4,'Café',1.50,1),
  (5,'Thé',1.50,1),
  (6,'Chips',1.20,2),
  (7,'Barre chocolatée',1.30,2),
  (8,'Bonbons',1.00,2),
  (9,'Cookies',1.50,4),
  (10,'Muffin',2.00,4),
  (11,'Sandwich jambon',3.50,3),
  (12,'Sandwich poulet',4.00,3),
  (13,'Panini',4.50,3),
  (14,'Salade',4.00,3),
  (15,'Croissant',1.20,4),
  (16,'Pain au chocolat',1.30,4),
  (17,'Fromage',2.00,5),
  (18,'Yaourt',1.50,5),
  (19,'Fruit',1.00,5),
  (20,'Gaufre',2.50,4);
