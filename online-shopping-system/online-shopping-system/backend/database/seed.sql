USE online_shopping;
INSERT IGNORE INTO categories (name) VALUES
('Electronics'), ('Fashion'), ('Home'), ('Books'), ('Sports');

INSERT INTO products (name, description, price, stock, image_url, category_id)
SELECT 'Wireless Headphones', 'Comfortable wireless headphones for everyday listening.', 2499.00, 25, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800', id FROM categories WHERE name='Electronics'
AND NOT EXISTS (SELECT 1 FROM products WHERE name='Wireless Headphones');
INSERT INTO products (name, description, price, stock, image_url, category_id)
SELECT 'Everyday Backpack', 'A durable backpack with room for your daily essentials.', 1499.00, 30, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', id FROM categories WHERE name='Fashion'
AND NOT EXISTS (SELECT 1 FROM products WHERE name='Everyday Backpack');
INSERT INTO products (name, description, price, stock, image_url, category_id)
SELECT 'Classic Desk Lamp', 'Minimal desk lamp for a comfortable workspace.', 999.00, 18, 'https://images.unsplash.com/photo-150\r\n7473885765-e6ed057f782c?w=800', id FROM categories WHERE name='Home'
AND NOT EXISTS (SELECT 1 FROM products WHERE name='Classic Desk Lamp');
