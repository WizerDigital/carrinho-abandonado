import { query } from './src/config/db.js';

async function migrate() {
  try {
    console.log('Starting migration...');
    // Drop the old clients table
    await query(`DROP TABLE IF EXISTS clients CASCADE;`);
    console.log('Dropped old clients table.');

    // Rename customers to clients
    await query(`ALTER TABLE IF EXISTS customers RENAME TO clients;`);
    console.log('Renamed customers to clients.');

    // Rename customer_id to client_id in sales
    await query(`ALTER TABLE IF EXISTS sales RENAME COLUMN customer_id TO client_id;`);
    console.log('Renamed customer_id to client_id in sales.');

    // Add new columns to clients
    await query(`ALTER TABLE IF EXISTS clients ADD COLUMN IF NOT EXISTS whatsapp_id TEXT;`);
    await query(`ALTER TABLE IF EXISTS clients ADD COLUMN IF NOT EXISTS jid TEXT;`);
    await query(`ALTER TABLE IF EXISTS clients ADD COLUMN IF NOT EXISTS lid TEXT;`);
    console.log('Added whatsapp columns to clients.');

    // Add unique constraint for phone per tenant
    await query(`ALTER TABLE IF EXISTS clients DROP CONSTRAINT IF EXISTS clients_tenant_id_phone_key;`);
    await query(`ALTER TABLE IF EXISTS clients ADD CONSTRAINT clients_tenant_id_phone_key UNIQUE(tenant_id, phone);`);
    console.log('Added unique constraint.');

    console.log('Migration successful!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();