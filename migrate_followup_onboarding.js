import { query } from './src/config/db.js';

async function migrate() {
  try {
    console.log('Migrando agent_settings para followup_enabled...');
    await query(`ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS followup_enabled BOOLEAN DEFAULT FALSE;`);
    
    console.log('Migrando tenants para onboarding_completed...');
    await query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;`);

    console.log('Migração concluída!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();