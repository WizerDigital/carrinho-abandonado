import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();

const wahaApi = axios.create({
  baseURL: process.env.WAHA_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
    ...(process.env.WAHA_SECRET_KEY && { 'X-Api-Key': process.env.WAHA_SECRET_KEY })
  }
});

// Helper to get or create settings
async function getOrCreateSettings(tenantId) {
  let res = await query('SELECT * FROM agent_settings WHERE tenant_id = $1', [tenantId]);
  if (res.rows.length === 0) {
    res = await query(
      `INSERT INTO agent_settings (tenant_id) VALUES ($1) RETURNING *`,
      [tenantId]
    );
  }
  return res.rows[0];
}

// Get current settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req.user.tenant_id);
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar configurações do agente' });
  }
});

// Update settings
router.put('/', requireAuth, async (req, res) => {
  const { 
    agent_name,
    followup_enabled,
    followup_delay_minutes,
    followup_message,
    personality, 
    communication_tone, 
    active_products, 
    faq_items, 
    objection_handlers, 
    system_prompt_template 
  } = req.body;
  
  try {
    const updated = await query(
      `UPDATE agent_settings 
       SET agent_name = $1,
           followup_enabled = $2,
           followup_delay_minutes = $3,
           followup_message = $4,
           personality = $5, 
           communication_tone = $6, 
           active_products = $7, 
           faq_items = $8,
           objection_handlers = $9,
           system_prompt_template = $10,
           updated_at = NOW() 
       WHERE tenant_id = $11 RETURNING *`,
      [
        agent_name,
        followup_enabled,
        followup_delay_minutes,
        followup_message,
        personality, 
        communication_tone, 
        JSON.stringify(active_products || []), 
        JSON.stringify(faq_items || []),
        JSON.stringify(objection_handlers || []),
        system_prompt_template,
        req.user.tenant_id
      ]
    );
    res.json(updated.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// View Prompt for a specific contact (dev/preview)
router.get('/prompt-preview/:contactId', requireAuth, async (req, res) => {
  try {
    const { getSystemPrompt } = await import('../../../src/agent/system_prompt.js');
    const prompt = await getSystemPrompt(req.user.tenant_id, req.params.contactId);
    res.json({ prompt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar preview do prompt' });
  }
});

// WAHA: Start Session
router.post('/waha/start', requireAuth, async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req.user.tenant_id);
    let sessionId = settings.waha_session_id;
    
    if (!sessionId) {
      sessionId = `tenant_${req.user.tenant_id}`;
      await query(`UPDATE agent_settings SET waha_session_id = $1 WHERE tenant_id = $2`, [sessionId, req.user.tenant_id]);
    }

    // Call WAHA to start
    await wahaApi.post('/api/sessions/start', {
      name: sessionId,
      config: {
        ignore: {
          status: true,
          groups: true,
          channels: true,
          broadcast: true
        },
        webhooks: [
          {
            url: `${process.env.APP_URL || process.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}/webhook`,
            events: [
              "message",
              "message.any"
            ]
          }
        ]
      }
    });
    
    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('Error starting WAHA session:', error?.response?.data || error.message);
    res.status(500).json({ error: 'Erro ao iniciar sessão do WAHA' });
  }
});

// WAHA: Get QR Code
router.get('/waha/qr', requireAuth, async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req.user.tenant_id);
    const sessionId = settings.waha_session_id;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Sessão não iniciada' });
    }

    const response = await wahaApi.get(`/api/${sessionId}/auth/qr?format=image`, {
      responseType: 'arraybuffer'
    });
    
    res.set('Content-Type', 'image/png');
    res.send(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar QR Code' });
  }
});

// WAHA: Get Status
router.get('/waha/status', requireAuth, async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req.user.tenant_id);
    const sessionId = settings.waha_session_id;
    
    if (!sessionId) {
      return res.json({ status: 'STOPPED' });
    }

    const response = await wahaApi.get(`/api/sessions/${sessionId}`);
    const wahaStatus = response.data.status;
    
    // Update db status if changed
    if (wahaStatus !== settings.waha_status) {
      await query(`UPDATE agent_settings SET waha_status = $1 WHERE tenant_id = $2`, [wahaStatus, req.user.tenant_id]);
    }

    res.json({ status: wahaStatus, me: response.data.me });
  } catch (error) {
    res.json({ status: 'STOPPED' });
  }
});

// WAHA: Stop Session
router.post('/waha/stop', requireAuth, async (req, res) => {
  try {
    const settings = await getOrCreateSettings(req.user.tenant_id);
    const sessionId = settings.waha_session_id;
    
    if (sessionId) {
      await wahaApi.post(`/api/sessions/${sessionId}/stop`);
      await query(`UPDATE agent_settings SET waha_status = 'STOPPED' WHERE tenant_id = $1`, [req.user.tenant_id]);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao parar sessão' });
  }
});

export default router;
