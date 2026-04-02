import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import salesRoutes from './routes/sales.js';
import customersRoutes from './routes/customers.js';
import integrationsRoutes from './routes/integrations.js';
import dashboardRoutes from './routes/dashboard.js';
import agentSettingsRoutes from './routes/agentSettings.js';
import { startAbandonedCartWorker } from './workers/abandonedCartWorker.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/agent-settings', agentSettingsRoutes);

const PORT = process.env.BACKEND_PORT || 4005;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  // Start the abandoned cart worker checking every 5 minutes
  startAbandonedCartWorker(5 * 60 * 1000);
});
