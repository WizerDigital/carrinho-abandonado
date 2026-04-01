import { query } from './backend/src/config/db.js';

async function run() {
  const { rows } = await query("SELECT id, status, amount, platform, transaction_id FROM sales");
  console.log(rows);
  process.exit(0);
}
run();
