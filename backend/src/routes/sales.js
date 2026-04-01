import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT s.*, p.name as product_name, c.name as customer_name 
      FROM sales s 
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.tenant_id = $1 ORDER BY s.created_at DESC
    `, [req.user.tenant_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', async (req, res) => {
  const { customer_id, product_id, amount, status } = req.body;
  try {
    const { rows } = await query(
      'INSERT INTO sales (tenant_id, customer_id, product_id, amount, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.tenant_id, customer_id, product_id, amount, status || 'pendente']
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
