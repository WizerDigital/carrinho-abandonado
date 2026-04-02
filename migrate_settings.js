import { query } from './src/config/db.js';

async function run() {
  try {
    console.log('Migrando agent_settings...');
    await query(`ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS agent_name VARCHAR(255) DEFAULT 'Assistente';`);
    await query(`ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS followup_delay_minutes INTEGER DEFAULT 60;`);
    await query(`ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS followup_message TEXT;`);
    await query(`ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS faq_items JSONB DEFAULT '[]';`);
    await query(`ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS objection_handlers JSONB DEFAULT '[]';`);
    await query(`ALTER TABLE agent_settings ADD COLUMN IF NOT EXISTS system_prompt_template TEXT;`);
    console.log('Migração de agent_settings concluída com sucesso!');
  } catch (error) {
    console.error('Erro na migração:', error);
  } finally {
    process.exit(0);
  }
}

run();