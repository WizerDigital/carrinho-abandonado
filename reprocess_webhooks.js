import { processWebhook } from './backend/src/services/webhookProcessor.js';
import { query } from './backend/src/config/db.js';

async function run() {
  try {
    console.log('Fetching webhooks...');
    const { rows } = await query("SELECT tenant_id, platform, payload FROM integration_webhooks WHERE platform = 'hotmart'");
    console.log(`Found ${rows.length} webhooks.`);
    
    for (const row of rows) {
      await processWebhook(row.tenant_id, row.platform, row.payload);
    }
    
    console.log('Successfully reprocessed all webhooks!');
  } catch (e) {
    console.error('Error processing webhooks:', e);
  } finally {
    process.exit(0);
  }
}
run();
