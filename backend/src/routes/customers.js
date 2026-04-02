import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM clients WHERE tenant_id = $1 ORDER BY created_at DESC', [req.user.tenant_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: customerRows } = await query('SELECT * FROM clients WHERE id = $1 AND tenant_id = $2', [id, req.user.tenant_id]);
    
    if (customerRows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customerRows[0];
    
    const { rows: salesRows } = await query(`
      SELECT s.*, p.name as product_name, p.platform as platform_name
      FROM sales s
      LEFT JOIN products p ON s.product_id = p.id
      WHERE s.client_id = $1 AND s.tenant_id = $2
      ORDER BY s.created_at DESC
    `, [id, req.user.tenant_id]);

    let agentActions = [];
    if (customer.phone) {
      const { rows: actionsRows } = await query(`
        SELECT role, content, created_at
        FROM conversation_messages
        WHERE tenant_id = $1 AND contact_id = $2
        ORDER BY created_at ASC
      `, [req.user.tenant_id, customer.phone]);
      agentActions = actionsRows;
    }

    res.json({
      ...customer,
      sales: salesRows,
      agentActions
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', async (req, res) => {
  const { name, email, phone, type } = req.body;
  try {
    const { rows } = await query(
      'INSERT INTO clients (tenant_id, name, email, phone, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.tenant_id, name, email, phone, type || 'lead']
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
