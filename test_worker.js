import { query } from './backend/src/config/db.js';
import { processAbandonedCarts } from './backend/src/workers/abandonedCartWorker.js';

async function run() {
  // Set sale to pendente and old created_at
  await query("UPDATE sales SET status = 'pendente', created_at = NOW() - INTERVAL '2 hours'");
  console.log("Updated sale to 'pendente' and 2 hours old.");
  
  // Run worker
  await processAbandonedCarts();
  
  // Check sale status
  const { rows } = await query("SELECT id, status FROM sales");
  console.log("Current sales:", rows);
  
  process.exit(0);
}
run();
