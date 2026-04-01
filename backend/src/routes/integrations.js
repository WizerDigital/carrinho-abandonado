import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { processWebhook } from '../services/webhookProcessor.js';

const router = express.Router();

// Webhook endpoint (public)
router.post('/webhook/:tenant_id/:platform', async (req, res) => {
  const { tenant_id, platform } = req.params;
  const payload = req.body;
  
  if (!['hotmart', 'kiwify'].includes(platform)) {
    return res.status(400).json({ error: 'Unsupported platform' });
  }

  try {
    await query(
      'INSERT INTO integration_webhooks (tenant_id, platform, payload) VALUES ($1, $2, $3)',
      [tenant_id, platform, payload]
    );

    // Process the webhook payload asynchronously or synchronously
    await processWebhook(tenant_id, platform, payload);

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Protected routes
router.use(requireAuth);

router.get('/webhooks', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM integration_webhooks WHERE tenant_id = $1 ORDER BY created_at DESC', [req.user.tenant_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/url/:platform', async (req, res) => {
  const { platform } = req.params;
  const tenant_id = req.user.tenant_id;
  // This will generate the URL for the frontend to show
  // Let's assume the backend will run on localhost:4000 for now, but in prod it will be a real domain
  const host = req.get('host');
  const protocol = req.protocol;
  const webhookUrl = `${protocol}://${host}/api/integrations/webhook/${tenant_id}/${platform}`;
  
  res.json({ webhookUrl });
});

export default router;
