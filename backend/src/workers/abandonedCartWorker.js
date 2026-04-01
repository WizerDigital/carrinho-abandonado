import { query } from '../config/db.js';

export async function processAbandonedCarts() {
  try {
    // Find sales that have been 'pendente' for more than 1 hour
    const res = await query(`
      UPDATE sales
      SET status = 'carrinho abandonado', updated_at = NOW()
      WHERE status = 'pendente'
      AND created_at < NOW() - INTERVAL '1 hour'
      RETURNING id, tenant_id, customer_id, product_id, transaction_id;
    `);

    if (res.rows.length > 0) {
      console.log(`[Worker] Marked ${res.rows.length} sales as abandoned carts.`);
      
      // Here we could also trigger an event or message via WhatsApp
      // For now, we just update the status in the database.
    }
  } catch (error) {
    console.error('[Worker] Error processing abandoned carts:', error);
  }
}

export function startAbandonedCartWorker(intervalMs = 5 * 60 * 1000) {
  console.log(`[Worker] Starting abandoned cart worker (interval: ${intervalMs}ms)`);
  // Run immediately on start
  processAbandonedCarts();
  // Then run every intervalMs (e.g. every 5 minutes)
  setInterval(processAbandonedCarts, intervalMs);
}
