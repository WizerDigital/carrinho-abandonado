import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM customers WHERE tenant_id = $1 ORDER BY created_at DESC', [req.user.tenant_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', async (req, res) => {
  const { name, email, phone, type } = req.body;
  try {
    const { rows } = await query(
      'INSERT INTO customers (tenant_id, name, email, phone, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.tenant_id, name, email, phone, type || 'lead']
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
