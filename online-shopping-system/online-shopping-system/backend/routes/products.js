const router = require('express').Router();
const db = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', async (req, res, next) => {
  try {
    const { search = '', category = '', sort = 'newest' } = req.query;
    const conditions = ['p.is_active = 1'];
    const params = [];
    if (search.trim()) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }
    if (category) { conditions.push('p.category_id = ?'); params.push(category); }
    const order = sort === 'price_asc' ? 'p.price ASC'
      : sort === 'price_desc' ? 'p.price DESC'
      : sort === 'name' ? 'p.name ASC' : 'p.created_at DESC';
    const [rows] = await db.execute(
      `SELECT p.id, p.name, p.description, p.price, p.stock, p.image_url, p.category_id, c.name AS category
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE ${conditions.join(' AND ')} ORDER BY ${order}`, params
    );
    res.json({ products: rows });
  } catch (err) { next(err); }
});

router.get('/categories', async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT id, name FROM categories ORDER BY name');
    res.json({ categories: rows });
  } catch (err) { next(err); }
});

router.get('/admin/all', authenticate, adminOnly, async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.*, c.name AS category FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.created_at DESC`
    );
    res.json({ products: rows });
  } catch (err) { next(err); }
});

router.post('/', authenticate, adminOnly, async (req, res, next) => {
  try {
    const { name, description = '', price, stock = 0, image_url = '', category_id = null } = req.body;
    if (!name || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({ message: 'Name, valid price, and non-negative stock are required.' });
    }
    const [result] = await db.execute(
      'INSERT INTO products (name, description, price, stock, image_url, category_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, Number(price), Number(stock), image_url, category_id || null]
    );
    res.status(201).json({ message: 'Product created.', id: result.insertId });
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, adminOnly, async (req, res, next) => {
  try {
    const { name, description = '', price, stock = 0, image_url = '', category_id = null, is_active = 1 } = req.body;
    if (!name || !Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0) {
      return res.status(400).json({ message: 'Enter valid product details.' });
    }
    const [result] = await db.execute(
      'UPDATE products SET name=?, description=?, price=?, stock=?, image_url=?, category_id=?, is_active=? WHERE id=?',
      [name, description, Number(price), Number(stock), image_url, category_id || null, is_active ? 1 : 0, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: 'Product not found.' });
    res.json({ message: 'Product updated.' });
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, adminOnly, async (req, res, next) => {
  try {
    const [result] = await db.execute('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Product not found.' });
    res.json({ message: 'Product removed from catalogue.' });
  } catch (err) { next(err); }
});

module.exports = router;
