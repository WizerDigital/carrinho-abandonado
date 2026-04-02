import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/stats', async (req, res) => {
  const tenant_id = req.user.tenant_id;
  const { startDate, endDate } = req.query;

  try {
    let dateFilter = '';
    const params = [tenant_id];
    
    if (startDate && endDate) {
      dateFilter = ' AND created_at >= $2 AND created_at <= $3';
      params.push(startDate, endDate + ' 23:59:59');
    }

    const productsRes = await query(`SELECT COUNT(*) FROM products WHERE tenant_id = $1${dateFilter.replace('$2', '$2').replace('$3', '$3')}`, params);
    const customersRes = await query(`SELECT COUNT(*) FROM clients WHERE tenant_id = $1${dateFilter}`, params);
    
    // For sales, we need to adjust param indices for status
    const statusParamIndex = params.length + 1;
    
    const salesRes = await query(
      `SELECT COUNT(*), SUM(amount) FROM sales WHERE tenant_id = $1${dateFilter} AND status = $${statusParamIndex}`, 
      [...params, 'aprovada']
    );
    
    const abandonedRes = await query(
      `SELECT COUNT(*) FROM sales WHERE tenant_id = $1${dateFilter} AND status = $${statusParamIndex}`, 
      [...params, 'carrinho abandonado']
    );
    
    const recoveredRes = await query(
      `SELECT COUNT(*), SUM(amount) FROM sales WHERE tenant_id = $1${dateFilter} AND status = $${statusParamIndex} AND recovered_cart = TRUE`, 
      [...params, 'aprovada']
    );

    // Get time-series data for the chart (sales over time)
    const chartRes = await query(`
      SELECT DATE(created_at) as date, 
             SUM(CASE WHEN status = 'aprovada' THEN amount ELSE 0 END) as sales,
             COUNT(CASE WHEN status = 'carrinho abandonado' THEN 1 END) as abandoned_count
      FROM sales 
      WHERE tenant_id = $1 ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `, params);

    res.json({
      total_products: parseInt(productsRes.rows[0].count),
      total_customers: parseInt(customersRes.rows[0].count),
      total_sales_count: parseInt(salesRes.rows[0].count),
      total_sales_amount: parseFloat(salesRes.rows[0].sum || 0),
      total_abandoned: parseInt(abandonedRes.rows[0].count),
      total_recovered_count: parseInt(recoveredRes.rows[0].count),
      total_recovered_amount: parseFloat(recoveredRes.rows[0].sum || 0),
      chart_data: chartRes.rows.map(r => ({
        date: r.date,
        sales: parseFloat(r.sales || 0),
        abandoned_count: parseInt(r.abandoned_count)
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
