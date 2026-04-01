import { query } from './backend/src/config/db.js';

async function run() {
  try {
    const { rows } = await query("SELECT id, platform, payload FROM integration_webhooks WHERE platform = 'kiwify' LIMIT 3");
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
