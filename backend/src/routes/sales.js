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
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.tenant_id = $1 ORDER BY s.created_at DESC
    `, [req.user.tenant_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      SELECT s.*, 
             p.name as product_name, 
             p.description as product_description,
             c.id as customer_id,
             c.name as customer_name,
             c.email as customer_email,
             c.phone as customer_phone
      FROM sales s 
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN clients c ON s.client_id = c.id
      WHERE s.id = $1 AND s.tenant_id = $2
    `, [id, req.user.tenant_id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Try to fetch payload data if available from integration_webhooks (this is a bit harder to match, but we can match transaction_id or just return basic details).
    // Actually, payload data might be stored somewhere else or not easily queryable by sale id, so let's just return the sale and customer details.
    // In our webhook Processor, we save the payload in `integration_webhooks` but we don't link it to the sale.
    // Let's try to find the webhook payload by transaction_id if possible.
    const sale = rows[0];
    let payload = null;
    if (sale.transaction_id) {
      const { rows: hookRows } = await query(`
        SELECT payload FROM integration_webhooks 
        WHERE tenant_id = $1 AND payload->>'transaction' = $2 OR payload->>'transactionId' = $2
        LIMIT 1
      `, [req.user.tenant_id, sale.transaction_id]);
      if (hookRows.length > 0) {
        payload = hookRows[0].payload;
      }
    }

    res.json({
      ...sale,
      payload
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', async (req, res) => {
  const { client_id, product_id, amount, status } = req.body;
  try {
    const { rows } = await query(
      'INSERT INTO sales (tenant_id, client_id, product_id, amount, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.tenant_id, client_id, product_id, amount, status || 'pendente']
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
