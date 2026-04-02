import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = { id: user.id, tenant_id: user.tenant_id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    const tenantRes = await query('SELECT onboarding_completed FROM tenants WHERE id = $1', [user.tenant_id]);
    const onboarding_completed = tenantRes.rows[0]?.onboarding_completed || false;

    res.json({ token, user: { id: user.id, email: user.email, tenant_id: user.tenant_id, role: user.role, onboarding_completed } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Name, email and password required' });

  try {
    const userCheck = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const tenantRes = await query('INSERT INTO tenants (name) VALUES ($1) RETURNING id', [name + " Workspace"]);
    const tenant_id = tenantRes.rows[0].id;

    const hash = await bcrypt.hash(password, 10);
    const userRes = await query(
      'INSERT INTO users (tenant_id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, role',
      [tenant_id, email, hash]
    );

    const user = userRes.rows[0];
    const payload = { id: user.id, tenant_id, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, email: user.email, tenant_id, role: user.role, onboarding_completed: false } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows: userRows } = await query('SELECT id, email, tenant_id, role FROM users WHERE id = $1', [req.user.id]);
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRows[0];
    
    const { rows: tenantRows } = await query('SELECT onboarding_completed FROM tenants WHERE id = $1', [user.tenant_id]);
    const onboarding_completed = tenantRows[0]?.onboarding_completed || false;
    
    res.json({ ...user, onboarding_completed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/onboarding', requireAuth, async (req, res) => {
  try {
    await query('UPDATE tenants SET onboarding_completed = true WHERE id = $1', [req.user.tenant_id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/me', requireAuth, async (req, res) => {
  const { email, password } = req.body;
  try {
    if (email) {
      // check if email exists
      const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.user.id]);
      if (emailCheck.rows.length > 0) return res.status(400).json({ error: 'E-mail já está em uso.' });
      
      await query('UPDATE users SET email = $1 WHERE id = $2', [email, req.user.id]);
    }
    
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    }
    
    res.json({ success: true, email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
