import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/stats', async (req, res) => {
  const tenant_id = req.user.tenant_id;
  try {
    const productsRes = await query('SELECT COUNT(*) FROM products WHERE tenant_id = $1', [tenant_id]);
    const customersRes = await query('SELECT COUNT(*) FROM customers WHERE tenant_id = $1', [tenant_id]);
    const salesRes = await query('SELECT COUNT(*), SUM(amount) FROM sales WHERE tenant_id = $1 AND status = $2', [tenant_id, 'aprovada']);
    const abandonedRes = await query('SELECT COUNT(*) FROM sales WHERE tenant_id = $1 AND status = $2', [tenant_id, 'carrinho abandonado']);

    res.json({
      total_products: parseInt(productsRes.rows[0].count),
      total_customers: parseInt(customersRes.rows[0].count),
      total_sales_count: parseInt(salesRes.rows[0].count),
      total_sales_amount: parseFloat(salesRes.rows[0].sum || 0),
      total_abandoned: parseInt(abandonedRes.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
