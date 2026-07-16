import { Router } from 'express';
import { prisma } from '../../prisma';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { FulfillmentService } from '../../services/fulfillment.service';

export const adminOrdersRouter = Router();
adminOrdersRouter.use(authMiddleware);

// Guard: PLATFORM_ADMIN only
function requirePlatformAdmin(req: AuthRequest, res: any, next: any) {
  if (!req.user?.isPlatformAdmin) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Platform admin access required' });
  }
  next();
}
adminOrdersRouter.use(requirePlatformAdmin);

// 1. GET /api/admin/orders - Fetch paginated orders across all organizations
adminOrdersRouter.get('/', async (req, res) => {
  try {
    const { status, vendorId, campaignId, page = '1', limit = '50' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (status) where.status = status;
    if (campaignId) where.campaignId = campaignId;
    if (vendorId) {
      where.variant = { product: { vendorId } };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: { select: { id: true, name: true } },
          campaign: { select: { id: true, name: true } },
          recipient: { select: { id: true, name: true, email: true } },
          variant: { 
            include: { product: { select: { title: true, vendor: { select: { id: true, name: true } } } } }
          },
          shipment: true
        }
      }),
      prisma.order.count({ where })
    ]);

    res.json({ data: orders, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET /api/admin/orders/exception-count
adminOrdersRouter.get('/exception-count', async (req, res) => {
  try {
    const count = await prisma.order.count({
      where: { status: 'EXCEPTION' }
    });
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST /api/admin/orders/:id/advance
const advanceSchema = z.object({
  status: z.enum(['SHIPPED', 'DELIVERED']),
  carrier: z.string().optional(),
  trackingNumber: z.string().optional()
});

adminOrdersRouter.post('/:id/advance', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = advanceSchema.parse(req.body);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await prisma.$transaction(async (tx: any) => {
      // Create/Update shipment if tracking provided
      if (data.carrier || data.trackingNumber) {
        await tx.shipment.upsert({
          where: { orderId: id },
          update: { carrier: data.carrier, trackingNumber: data.trackingNumber },
          create: { orderId: id, carrier: data.carrier, trackingNumber: data.trackingNumber }
        });
      }

      await tx.order.update({
        where: { id },
        data: { status: data.status }
      });

      await tx.auditLog.create({
        data: {
          organizationId: order.organizationId,
          actorId: req.user!.id,
          action: 'ORDER_MANUAL_ADVANCE',
          targetType: 'ORDER',
          targetId: id,
          metadata: { from: order.status, to: data.status, tracking: data.trackingNumber }
        }
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 4. POST /api/admin/orders/:id/retry
adminOrdersRouter.post('/:id/retry', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id } });
    
    if (!order || order.status !== 'EXCEPTION') {
      return res.status(400).json({ error: 'Order is not in EXCEPTION status' });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.order.update({
        where: { id },
        data: { status: 'PENDING', exceptionNote: null }
      });

      await tx.auditLog.create({
        data: {
          organizationId: order.organizationId,
          actorId: req.user!.id,
          action: 'ORDER_RETRY',
          targetType: 'ORDER',
          targetId: id,
          metadata: { note: 'Manual retry initiated' }
        }
      });
    });

    await FulfillmentService.enqueueFulfillment(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 5. POST /api/admin/orders/:id/substitute
const substituteSchema = z.object({
  variantId: z.string(),
  note: z.string()
});

adminOrdersRouter.post('/:id/substitute', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const data = substituteSchema.parse(req.body);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.status !== 'EXCEPTION') {
      return res.status(400).json({ error: 'Order is not in EXCEPTION status' });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.order.update({
        where: { id },
        data: { variantId: data.variantId, status: 'PENDING', exceptionNote: null }
      });

      await tx.recipient.update({
        where: { id: order.recipientId },
        data: { redeemedVariantId: data.variantId }
      });

      await tx.auditLog.create({
        data: {
          organizationId: order.organizationId,
          actorId: req.user!.id,
          action: 'ORDER_SUBSTITUTE',
          targetType: 'ORDER',
          targetId: id,
          metadata: { oldVariantId: order.variantId, newVariantId: data.variantId, note: data.note }
        }
      });
    });

    await FulfillmentService.enqueueFulfillment(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 6. POST /api/admin/orders/:id/cancel
adminOrdersRouter.post('/:id/cancel', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ 
      where: { id },
      include: { campaign: true }
    });
    
    if (!order || order.status !== 'EXCEPTION') {
      return res.status(400).json({ error: 'Order is not in EXCEPTION status' });
    }

    const actualBase = order.priceCents;
    const actualFee = Math.floor((actualBase * order.campaign.serviceFeeBps) / 10000);
    const refundAmount = BigInt(actualBase + actualFee);

    await prisma.$transaction(async (tx: any) => {
      // Update Order
      await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      // Refund Wallet
      const wallet = await tx.wallet.findUnique({ where: { organizationId: order.organizationId } });
      if (wallet) {
        const newBalance = wallet.balanceCents + refundAmount;
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balanceCents: newBalance }
        });

        await tx.walletLedger.create({
          data: {
            walletId: wallet.id,
            amountCents: refundAmount,
            type: 'REFUND',
            referenceType: 'ORDER',
            referenceId: order.id,
            balanceAfterCents: newBalance,
            heldAfterCents: wallet.heldCents
          }
        });
      }

      await tx.auditLog.create({
        data: {
          organizationId: order.organizationId,
          actorId: req.user!.id,
          action: 'ORDER_CANCELLED',
          targetType: 'ORDER',
          targetId: id,
          metadata: { refundedAmount: Number(refundAmount) }
        }
      });
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});
