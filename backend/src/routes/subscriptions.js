import express from 'express';
import Stripe from 'stripe';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16' // or latest
});

// Map plans to their environment variables
const getPriceId = (planName) => {
  switch (planName) {
    case 'starter': return process.env.STRIPE_PRICE_STARTER;
    case 'pro': return process.env.STRIPE_PRICE_PRO;
    case 'scale': return process.env.STRIPE_PRICE_SCALE;
    default: return null;
  }
};

router.get('/status', requireAuth, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { rows } = await query('SELECT stripe_customer_id, stripe_subscription_id, plan, subscription_status, trial_ends_at FROM tenants WHERE id = $1', [tenantId]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    
    const tenant = rows[0];
    const isTrialing = tenant.subscription_status === 'trialing' && new Date() < new Date(tenant.trial_ends_at);
    const hasActiveSubscription = ['active', 'trialing'].includes(tenant.subscription_status);
    
    res.json({
      plan: tenant.plan,
      status: tenant.subscription_status,
      trialEndsAt: tenant.trial_ends_at,
      isTrialing,
      hasActiveSubscription
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    const priceId = getPriceId(plan);
    
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    const tenantId = req.user.tenantId;
    const { rows } = await query('SELECT name, stripe_customer_id FROM tenants WHERE id = $1', [tenantId]);
    const userRows = await query('SELECT email FROM users WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    
    let customerId = rows[0].stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userRows.rows[0]?.email,
        name: rows[0].name,
        metadata: { tenantId }
      });
      customerId = customer.id;
      await query('UPDATE tenants SET stripe_customer_id = $1 WHERE id = $2', [customerId, tenantId]);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/assinatura?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/assinatura?canceled=true`,
      metadata: { tenantId, plan }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/create-portal-session', requireAuth, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { rows } = await query('SELECT stripe_customer_id FROM tenants WHERE id = $1', [tenantId]);
    const customerId = rows[0]?.stripe_customer_id;

    if (!customerId) {
      return res.status(400).json({ error: 'No active customer found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/assinatura`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/invoices', requireAuth, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { rows } = await query('SELECT stripe_customer_id FROM tenants WHERE id = $1', [tenantId]);
    const customerId = rows[0]?.stripe_customer_id;

    if (!customerId) {
      return res.json([]);
    }

    const invoices = await stripe.invoices.list({ customer: customerId });
    res.json(invoices.data);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
