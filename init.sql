CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  whatsapp VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  document VARCHAR(50),
  type VARCHAR(50) DEFAULT 'lead' CHECK (type IN ('lead', 'cliente')),
  whatsapp_id TEXT,
  jid TEXT,
  lid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  platform_id VARCHAR(255),
  platform VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'cancelada', 'carrinho abandonado', 'reembolsada', 'chargeback', 'expirada', 'atrasada', 'disputa', 'completa')),
  transaction_id VARCHAR(255),
  platform VARCHAR(50),
  recovered_cart BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('hotmart', 'kiwify')),
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  waha_session_id VARCHAR(255),
  waha_status VARCHAR(50) DEFAULT 'disconnected',
  agent_name VARCHAR(255) DEFAULT 'Assistente',
  followup_enabled BOOLEAN DEFAULT FALSE,
  followup_delay_minutes INTEGER DEFAULT 60,
  followup_message TEXT,
  personality TEXT,
  communication_tone VARCHAR(50) DEFAULT 'formal',
  active_products JSONB DEFAULT '[]',
  faq_items JSONB DEFAULT '[]',
  objection_handlers JSONB DEFAULT '[]',
  system_prompt_template TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Data
INSERT INTO tenants (id, name) VALUES ('11111111-1111-1111-1111-111111111111', 'Wizer Digital') ON CONFLICT DO NOTHING;
-- We will hash the password in Node.js, but for seed we can insert a dummy hash and run an init script, or generate hash with pgcrypto.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO users (tenant_id, email, password_hash) 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'suporte@wizer.digital', 
  crypt('Foco@ia8992!', gen_salt('bf', 10))
) ON CONFLICT (email) DO NOTHING;

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  contact_id TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_msgs_tenant_contact ON conversation_messages(tenant_id, contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_msgs_embedding ON conversation_messages USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS conversation_summaries (
  tenant_id UUID,
  contact_id TEXT,
  summary TEXT NOT NULL DEFAULT '',
  is_bot_paused BOOLEAN DEFAULT FALSE,
  bot_paused_at TIMESTAMPTZ,
  UNIQUE(tenant_id, contact_id)
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  contact_id TEXT,
  tool_name TEXT NOT NULL,
  tool_args JSONB,
  tool_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
