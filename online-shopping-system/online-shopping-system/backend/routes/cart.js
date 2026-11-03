const router = require('express').Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const [items] = await db.execute(
      `SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock, p.image_url
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.user_id = ? AND p.is_active = 1 ORDER BY ci.created_at DESC`, [req.user.id]
    );
    res.json({ items });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const productId = Number(req.body.product_id);
    const quantity = Number(req.body.quantity || 1);
    if (!Number.isInteger(productId) || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'Invalid product or quantity.' });
    }
    const [products] = await db.execute('SELECT id, stock, is_active FROM products WHERE id=?', [productId]);
    if (!products.length || !products[0].is_active) return res.status(404).json({ message: 'Product unavailable.' });
    if (quantity > products[0].stock) return res.status(400).json({ message: 'Not enough stock available.' });
    await db.execute(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = LEAST(quantity + VALUES(quantity), ?)`,
      [req.user.id, productId, quantity, products[0].stock]
    );
    res.status(201).json({ message: 'Added to cart.' });
  } catch (err) { next(err); }
});

router.patch('/:productId', async (req, res, next) => {
  try {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ message: 'Quantity must be at least 1.' });
    const [p] = await db.execute('SELECT stock FROM products WHERE id=? AND is_active=1', [req.params.productId]);
    if (!p.length) return res.status(404).json({ message: 'Product unavailable.' });
    if (quantity > p[0].stock) return res.status(400).json({ message: 'Requested quantity exceeds stock.' });
    const [result] = await db.execute('UPDATE cart_items SET quantity=? WHERE user_id=? AND product_id=?', [quantity, req.user.id, req.params.productId]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Cart item not found.' });
    res.json({ message: 'Cart updated.' });
  } catch (err) { next(err); }
});

router.delete('/:productId', async (req, res, next) => {
  try {
    await db.execute('DELETE FROM cart_items WHERE user_id=? AND product_id=?', [req.user.id, req.params.productId]);
    res.json({ message: 'Item removed.' });
  } catch (err) { next(err); }
});

module.exports = router;
