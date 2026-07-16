import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { Queue } from 'bullmq';
import { 
  createCampaignSchema, 
  updateCampaignSchema, 
  addCampaignProductSchema
} from '@gifting/shared';
import { QUEUES, createRedisClient } from '@gifting/shared/src/redis';
import { CampaignService } from '../services/campaign.service';
import { ActivationService } from '../services/activation.service';
import { sendEmailWithLog, recipientInviteHtml } from '../services/email';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { prisma } from '../prisma';
import { logError } from '../utils/logger';

const upload = multer({ storage: multer.memoryStorage() });

export const campaignsRouter = Router({ mergeParams: true });

campaignsRouter.use(authMiddleware);

const csvQueue = new Queue(QUEUES.CSV_IMPORT, { connection: createRedisClient() as any });

// List campaigns
campaignsRouter.get('/', requireRole(['OWNER', 'ADMIN', 'MEMBER', 'FINANCE']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ campaigns });
  } catch (error) {
    logError('GET /campaigns', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create campaign (Only OWNER, ADMIN, MEMBER. FINANCE cannot create)
campaignsRouter.post('/', requireRole(['OWNER', 'ADMIN', 'MEMBER']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const userId = req.user!.id;
    const data = createCampaignSchema.parse(req.body);

    const campaign = await CampaignService.createCampaign(orgId, userId, data);
    return res.status(201).json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    logError('POST /campaigns', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single campaign
campaignsRouter.get('/:id', requireRole(['OWNER', 'ADMIN', 'MEMBER', 'FINANCE']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const campaignId = req.params.id;
    const campaign = await CampaignService.getCampaign(orgId, campaignId);
    
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    return res.json({ campaign });
  } catch (error) {
    logError('GET /campaigns/:id', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Campaign Analytics
campaignsRouter.get('/:id/analytics', requireRole(['OWNER', 'ADMIN', 'MEMBER', 'FINANCE']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const campaignId = req.params.id;
    
    const redis = createRedisClient();
    const cacheKey = `campaign-analytics:${campaignId}`;
    
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, organizationId: orgId }
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Recipient metrics
    const recipients = await prisma.recipient.findMany({ where: { campaignId } });
    
    const recipientStatusCounts = recipients.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Orders (for fulfillment funnel and spend calculation)
    const orders = await prisma.order.findMany({
      where: { campaignId },
      include: {
        variant: { include: { product: { select: { title: true } } } }
      }
    });

    const orderStatusCounts = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Product Pick Breakdown
    const productPicks: Record<string, number> = {};
    orders.forEach(o => {
      if (o.status !== 'CANCELLED') {
        const title = o.variant.product.title;
        productPicks[title] = (productPicks[title] || 0) + 1;
      }
    });

    // Financials
    const totalSpentCents = orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.priceCents : 0), 0);
    const serviceFeeBps = campaign.serviceFeeBps;
    const totalFeeCents = Math.floor((totalSpentCents * serviceFeeBps) / 10000);
    const actualSpend = totalSpentCents + totalFeeCents;

    // Estimate total held based on original campaign limits
    const walletLedgers = await prisma.walletLedger.findMany({
      where: { 
        referenceType: 'CAMPAIGN',
        referenceId: campaignId,
        type: 'HOLD'
      }
    });
    
    const releasedLedgers = await prisma.walletLedger.findMany({
      where: {
        referenceType: { in: ['CAMPAIGN', 'RECIPIENT_REMOVED', 'ORDER'] },
        type: 'HOLD_RELEASE'
      }
    });
    // For a fully accurate picture, we just calculate the active hold currently remaining.
    let initiallyHeld = 0n;
    walletLedgers.forEach(wl => initiallyHeld += BigInt(wl.amountCents));
    
    // An easier proxy: (total invited recipients * max cost) - spent.
    // Let's just pass raw counts and let the frontend format.

    const result = {
      funnel: {
        invited: recipientStatusCounts['INVITED'] || 0,
        viewed: recipientStatusCounts['VIEWED'] || 0,
        redeemed: recipientStatusCounts['REDEEMED'] || 0,
        shipped: (orderStatusCounts['SHIPPED'] || 0) + (orderStatusCounts['DELIVERED'] || 0),
        delivered: orderStatusCounts['DELIVERED'] || 0,
        bounced: recipientStatusCounts['BOUNCED'] || 0,
        optedOut: recipientStatusCounts['OPTED_OUT'] || 0,
        removed: recipientStatusCounts['REMOVED'] || 0,
        exception: orderStatusCounts['EXCEPTION'] || 0,
      },
      productPicks,
      financials: {
        totalSpent: actualSpend,
        totalOrders: orders.filter(o => o.status !== 'CANCELLED').length
      }
    };

    await redis.setex(cacheKey, 30, JSON.stringify(result));

    return res.json(result);
  } catch (error) {
    logError('GET /campaigns/:id/analytics', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV Export for Campaign Recipients
campaignsRouter.get('/:id/export', requireRole(['OWNER', 'ADMIN', 'FINANCE']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const campaignId = req.params.id;
    
    const recipients = await prisma.recipient.findMany({
      where: { campaignId, campaign: { organizationId: orgId } },
      include: {
        order: { include: { shipment: true } },
        redeemedVariant: { include: { product: true } }
      }
    });

    const headers = ['Name', 'Email', 'Status', 'Product', 'Order Status', 'Carrier', 'Tracking Number'];
    const rows = recipients.map(r => {
      const product = r.redeemedVariant?.product.title || '';
      const oStatus = r.order?.status || '';
      const carrier = r.order?.shipment?.carrier || '';
      const tracking = r.order?.shipment?.trackingNumber || '';
      return [r.name, r.email, r.status, product, oStatus, carrier, tracking]
        .map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`)
        .join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=campaign-${campaignId}-export.csv`);
    return res.send(csvContent);
  } catch (error) {
    logError('GET /campaigns/:id/export', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update campaign
campaignsRouter.put('/:id', requireRole(['OWNER', 'ADMIN', 'MEMBER']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const campaignId = req.params.id;
    const data = updateCampaignSchema.parse(req.body);

    const campaign = await CampaignService.updateCampaign(orgId, campaignId, data);
    return res.json({ campaign });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    logError('PUT /campaigns/:id', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Add product to campaign
campaignsRouter.post('/:id/products', requireRole(['OWNER', 'ADMIN', 'MEMBER']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const campaignId = req.params.id;
    const data = addCampaignProductSchema.parse(req.body);

    const cp = await CampaignService.addProduct(orgId, campaignId, data);
    return res.json({ campaignProduct: cp });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    logError('POST /campaigns/:id/products', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove product from campaign
campaignsRouter.delete('/:id/products/:productId', requireRole(['OWNER', 'ADMIN', 'MEMBER']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const campaignId = req.params.id;
    const productId = req.params.productId;

    await CampaignService.removeProduct(orgId, campaignId, productId);
    return res.json({ success: true });
  } catch (error) {
    logError('DELETE /campaigns/:id/products/:productId', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// CSV Upload for recipients
campaignsRouter.post('/:id/recipients/csv', requireRole(['OWNER', 'ADMIN', 'MEMBER']), upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const campaignId = req.params.id;
    
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const rawContent = req.file.buffer.toString('utf-8');
    
    // Create RecipientImport record
    const recipientImport = await prisma.recipientImport.create({
      data: {
        organizationId: orgId,
        campaignId,
        rawContent,
        status: 'PENDING'
      }
    });

    // Enqueue job for worker
    await csvQueue.add('process-csv', { importId: recipientImport.id });

    return res.json({ importId: recipientImport.id });
  } catch (error) {
    logError('POST /campaigns/:id/recipients/csv', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Polling endpoint for job status
campaignsRouter.get('/:id/recipients/import-status/:importId', requireRole(['OWNER', 'ADMIN', 'MEMBER', 'FINANCE']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const importId = req.params.importId;
    
    const imp = await prisma.recipientImport.findUnique({
      where: { id: importId, organizationId: orgId }
    });
    
    if (!imp) return res.status(404).json({ error: 'Import not found' });
    
    return res.json({
      status: imp.status,
      totalRows: imp.totalRows,
      processedRows: imp.processedRows,
      errorReport: imp.errorReport,
    });
  } catch (error) {
    logError('GET /campaigns/:id/recipients/import-status', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get campaign recipients
campaignsRouter.get('/:id/recipients', requireRole(['OWNER', 'ADMIN', 'MEMBER', 'FINANCE']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const campaignId = req.params.id;
    
    const recipients = await prisma.recipient.findMany({
      where: { campaignId, campaign: { organizationId: orgId } },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit for now
    });
    
    return res.json({ recipients });
  } catch (error) {
    logError('GET /campaigns/:id/recipients', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Re-invite bounced recipient
campaignsRouter.post('/:id/recipients/:recipientId/re-invite', requireRole(['OWNER', 'ADMIN', 'MEMBER']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const campaignId = req.params.id;
    const recipientId = req.params.recipientId;
    const { newEmail } = req.body; // optionally fix the email
    
    const recipient = await prisma.recipient.findUnique({
      where: { id: recipientId, campaignId, campaign: { organizationId: orgId } },
      include: { campaign: { include: { organization: true } } }
    });
    
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
    if (recipient.status !== 'BOUNCED' && recipient.status !== 'REMOVED') {
      return res.status(400).json({ error: 'Recipient must be BOUNCED or REMOVED to re-invite' });
    }

    const emailToUse = newEmail || recipient.email;
    const crypto = require('crypto');
    const newRawToken = crypto.randomBytes(16).toString('hex');
    const newTokenHash = crypto.createHash('sha256').update(newRawToken).digest('hex');
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/r/${newRawToken}`;

    const updatedRecipient = await prisma.recipient.update({
      where: { id: recipientId },
      data: {
        email: emailToUse,
        status: 'INVITED',
        tokenHash: newTokenHash,
        reminderCount: 0,
      }
    });

    const html = recipientInviteHtml(
      recipient.campaign.organization.name,
      recipient.campaign.messageTemplate,
      recipient.name,
      inviteUrl
    );

    await sendEmailWithLog(
      {
        to: updatedRecipient.email,
        subject: `A gift from ${recipient.campaign.organization.name}`,
        html
      },
      'RECIPIENT',
      recipient.id,
      'INVITE'
    );

    return res.json({ success: true, recipient: updatedRecipient });
  } catch (error: any) {
    logError('POST /campaigns/:id/recipients/:recipientId/re-invite', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a bounced recipient (triggers HOLD_RELEASE)
campaignsRouter.post('/:id/recipients/:recipientId/remove', requireRole(['OWNER', 'ADMIN', 'MEMBER']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const campaignId = req.params.id;
    const recipientId = req.params.recipientId;
    
    await prisma.$transaction(async (tx) => {
      const recipient = await tx.recipient.findUnique({
        where: { id: recipientId, campaignId, campaign: { organizationId: orgId } },
        include: { campaign: true }
      });
      
      if (!recipient) throw new Error('Recipient not found');
      if (recipient.status !== 'BOUNCED') throw new Error('Only BOUNCED recipients can be removed');

      // Calculate hold release amount
      let heldPerRecipient = 0;
      if (recipient.campaign.mode === 'CHOICE') {
        heldPerRecipient = recipient.campaign.budgetCentsPerRecipient || 0;
      } else {
        const campaignProducts = await tx.campaignProduct.findMany({
          where: { campaignId: recipient.campaign.id },
          include: { product: { include: { variants: true } } }
        });
        const variants = campaignProducts[0]?.product.variants || [];
        heldPerRecipient = Math.max(0, ...variants.map(v => v.priceCents));
      }

      const heldBase = heldPerRecipient;
      const heldFee = Math.floor((heldBase * recipient.campaign.serviceFeeBps) / 10000);
      const totalHeldAmount = BigInt(heldBase + heldFee);

      const wallet = await tx.wallet.findUnique({
        where: { organizationId: recipient.campaign.organizationId }
      });

      if (!wallet) throw new Error('Wallet not found');

      const currentHeld = wallet.heldCents - totalHeldAmount;

      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          amountCents: totalHeldAmount,
          type: 'HOLD_RELEASE',
          referenceType: 'RECIPIENT_REMOVED',
          referenceId: recipient.id,
          balanceAfterCents: wallet.balanceCents,
          heldAfterCents: currentHeld
        }
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { heldCents: currentHeld }
      });

      await tx.recipient.update({
        where: { id: recipient.id },
        data: { status: 'REMOVED' }
      });
    });

    return res.json({ success: true });
  } catch (error: any) {
    logError('POST /campaigns/:id/recipients/:recipientId/remove', error);
    return res.status(400).json({ error: error.message });
  }
});

// Activate campaign
campaignsRouter.post('/:id/activate', requireRole(['OWNER', 'ADMIN', 'FINANCE']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const campaignId = req.params.id;
    const userId = req.user!.id;

    const campaign = await ActivationService.activateCampaign(orgId, campaignId, userId);
    
    // Serialize BigInt safely for response
    const serialized = JSON.parse(JSON.stringify(campaign, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return res.json({ campaign: serialized });
  } catch (error: any) {
    logError('POST /campaigns/:id/activate', error);
    return res.status(400).json({ error: error.message });
  }
});
