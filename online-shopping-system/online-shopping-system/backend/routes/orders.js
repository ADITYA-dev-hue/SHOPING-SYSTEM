const router = require('express').Router();
const db = require('../config/db');
const { authenticate, adminOnly } = require('../middleware/auth');
router.use(authenticate);

router.post('/', async (req, res, next) => {
  const conn = await db.getConnection();
  try {
    const { shipping_address } = req.body;
    if (!shipping_address || shipping_address.trim().length < 8) {
      conn.release();
      return res.status(400).json({ message: 'Please enter a complete shipping address.' });
    }
    await conn.beginTransaction();
    const [cart] = await conn.execute(
      `SELECT ci.product_id, ci.quantity, p.name, p.price, p.stock
       FROM cart_items ci JOIN products p ON p.id=ci.product_id
       WHERE ci.user_id=? AND p.is_active=1 FOR UPDATE`, [req.user.id]
    );
    if (!cart.length) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ message: 'Your cart is empty.' });
    }
    for (const item of cart) {
      if (item.quantity > item.stock) throw new Error(`Insufficient stock for ${item.name}.`);
    }
    const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const [orderResult] = await conn.execute(
      'INSERT INTO orders (user_id, total_amount, shipping_address, status, payment_method) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, total, shipping_address.trim(), 'Placed', 'Cash on Delivery']
    );
    for (const item of cart) {
      await conn.execute(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
        [orderResult.insertId, item.product_id, item.name, item.quantity, item.price]
      );
      await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }
    await conn.execute('DELETE FROM cart_items WHERE user_id=?', [req.user.id]);
    await conn.commit();
    res.status(201).json({ message: 'Order placed successfully.', order_id: orderResult.insertId });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ message: err.message || 'Could not place order.' });
  } finally { conn.release(); }
});

router.get('/my', async (req, res, next) => {
  try {
    const [orders] = await db.execute('SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
    for (const order of orders) {
      const [items] = await db.execute('SELECT product_name, quantity, unit_price FROM order_items WHERE order_id=?', [order.id]);
      order.items = items;
    }
    res.json({ orders });
  } catch (err) { next(err); }
});

router.get('/admin/all', adminOnly, async (req, res, next) => {
  try {
    const [orders] = await db.execute(
      `SELECT o.*, u.name AS customer_name, u.email AS customer_email
       FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC`
    );
    res.json({ orders });
  } catch (err) { next(err); }
});

router.patch('/admin/:id/status', adminOnly, async (req, res, next) => {
  try {
    const allowed = ['Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid order status.' });
    const [result] = await db.execute('UPDATE orders SET status=? WHERE id=?', [req.body.status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Order not found.' });
    res.json({ message: 'Order status updated.' });
  } catch (err) { next(err); }
});

module.exports = router;
