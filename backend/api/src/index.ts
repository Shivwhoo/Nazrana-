import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import { invoicesRouter } from './routes/invoices';
import { authRouter } from './routes/auth';
import { orgsRouter } from './routes/orgs';
import { teamRouter } from './routes/team';
import { catalogRouter } from './routes/catalog';
import { recipientRouter } from './routes/recipient';
import { adminCatalogRouter } from './routes/admin/catalog';
import { campaignsRouter } from './routes/campaigns';
import { walletRouter } from './routes/wallet';
import { adminWalletRouter } from './routes/admin/wallet';
import { adminOrdersRouter } from './routes/admin/orders';
import { adminMetricsRouter } from './routes/admin/metrics';
import { webhooksRouter } from './routes/webhooks';
const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/orgs', orgsRouter);
app.use('/api/orgs/:orgId/team', teamRouter);
app.use('/api/orgs/:orgId/campaigns', campaignsRouter);
app.use('/api/orgs/:orgId/invoices', invoicesRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/admin/catalog', adminCatalogRouter);
app.use('/api/admin/orders', adminOrdersRouter);
app.use('/api/admin/metrics', adminMetricsRouter);
app.use('/api/orgs/:orgId/wallet', walletRouter);
app.use('/api/admin/wallet', adminWalletRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/recipient', recipientRouter);

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
