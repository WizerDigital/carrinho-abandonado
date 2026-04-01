import { processWebhook } from './backend/src/services/webhookProcessor.js';
import { query } from './backend/src/config/db.js';

async function run() {
  try {
    console.log('Fetching kiwify webhooks...');
    const { rows } = await query("SELECT tenant_id, platform, payload FROM integration_webhooks WHERE platform = 'kiwify'");
    console.log(`Found ${rows.length} webhooks.`);
    
    for (const row of rows) {
      await processWebhook(row.tenant_id, row.platform, row.payload);
    }
    
    console.log('Successfully reprocessed all Kiwify webhooks!');
    
    // Check results
    const sales = await query("SELECT id, status, amount, platform, transaction_id FROM sales WHERE platform = 'kiwify'");
    console.log('Sales created:', sales.rows);
  } catch (e) {
    console.error('Error processing webhooks:', e);
  } finally {
    process.exit(0);
  }
}
run();
