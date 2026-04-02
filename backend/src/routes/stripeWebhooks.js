import express from 'express';
import Stripe from 'stripe';
import { query } from '../config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const router = express.Router();

router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata?.tenantId;
        const plan = session.metadata?.plan;
        
        if (tenantId && plan) {
          const subscriptionId = session.subscription;
          await query(
            'UPDATE tenants SET plan = $1, stripe_subscription_id = $2, subscription_status = $3 WHERE id = $4',
            [plan, subscriptionId, 'active', tenantId]
          );
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const status = subscription.status;
        const subscriptionId = subscription.id;
        
        await query(
          'UPDATE tenants SET subscription_status = $1 WHERE stripe_subscription_id = $2',
          [status, subscriptionId]
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;
        
        await query(
          'UPDATE tenants SET subscription_status = $1, plan = $2 WHERE stripe_subscription_id = $3',
          ['canceled', 'free', subscriptionId]
        );
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
