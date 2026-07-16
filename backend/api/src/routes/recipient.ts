import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { rateLimiter } from '../middleware/rateLimit';
import { encryptData } from '../utils/crypto';
import { FulfillmentService } from '../services/fulfillment.service';

export const recipientRouter = Router({ mergeParams: true });

// Apply strict rate limiting to all public recipient routes
recipientRouter.use(rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per IP per minute
  message: 'Too many requests from this IP, please try again after a minute'
}));

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Helper to return constant-time 404
function notAvailable(res: any) {
  // Constant time response
  return res.status(404).json({ error: 'This gift link is not available' });
}

// 1. Fetch Campaign and Recipient info
recipientRouter.get('/:token', async (req, res) => {
  try {
    const rawToken = req.params.token;
    if (!rawToken || rawToken.length !== 32) return notAvailable(res); // 16 bytes hex is 32 chars

    const tokenHash = hashToken(rawToken);

    const recipient = await prisma.recipient.findUnique({
      where: { tokenHash },
      include: {
        campaign: {
          include: {
            organization: { select: { name: true, brandingDefaults: true } },
            products: {
              include: {
                product: {
                  include: { variants: true }
                }
              }
            }
          }
        },
        order: {
          include: { shipment: true }
        }
      }
    });

    // Validations (invalid, expired, used)
    if (!recipient) return notAvailable(res);
    
    const now = new Date();
    if (recipient.campaign.expiresAt < now) return notAvailable(res);
    if (['REMOVED', 'BOUNCED'].includes(recipient.status)) return notAvailable(res);

    // If active and just viewed, update status
    if (recipient.status === 'INVITED') {
      await prisma.recipient.update({
        where: { id: recipient.id },
        data: { status: 'VIEWED' }
      });
      recipient.status = 'VIEWED';
    }

    // Scrub internal fields (like variant costs) before returning to public client
    const safeCampaign = {
      id: recipient.campaign.id,
      name: recipient.campaign.name,
      mode: recipient.campaign.mode,
      messageTemplate: recipient.campaign.messageTemplate,
      branding: recipient.campaign.branding,
      organization: recipient.campaign.organization,
      products: recipient.campaign.products.map(cp => ({
        id: cp.product.id,
        title: cp.product.title,
        description: cp.product.description,
        whatsInside: cp.product.whatsInside,
        images: cp.product.images,
        variants: cp.product.variants.filter(v => 
          recipient.campaign.mode === 'CHOICE' ? v.priceCents <= (recipient.campaign.budgetCentsPerRecipient || 0) : true
        ).map(v => ({
          id: v.id,
          title: v.title,
          isDigital: v.isDigital
        }))
      })).filter(p => p.variants.length > 0)
    };

    const safeRecipient = {
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      status: recipient.status,
      redeemedVariantId: recipient.redeemedVariantId,
      order: recipient.order ? {
        status: recipient.order.status,
        createdAt: recipient.order.createdAt,
        shipment: recipient.order.shipment
      } : null
    };

    return res.json({
      recipient: safeRecipient,
      campaign: safeCampaign
    });
  } catch (error) {
    console.error('GET /recipient/:token', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Check Pincode
const checkPincodeSchema = z.object({
  variantId: z.string(),
  pincode: z.string().length(6)
});

recipientRouter.post('/:token/check-pincode', async (req, res) => {
  try {
    const rawToken = req.params.token;
    if (!rawToken || rawToken.length !== 32) return notAvailable(res);
    
    const data = checkPincodeSchema.parse(req.body);
    
    const variant = await prisma.variant.findUnique({
      where: { id: data.variantId },
      include: { product: { include: { vendor: true } } }
    });

    if (!variant || variant.isDigital) {
      return res.json({ serviceable: true }); // Digital is always serviceable
    }

    const serviceablePincodes = variant.product.vendor.serviceablePincodes as string[] | null;
    if (serviceablePincodes && serviceablePincodes.length > 0) {
      if (!serviceablePincodes.includes(data.pincode)) {
        // Find digital fallback
        const digitalFallback = await prisma.variant.findFirst({
          where: {
            isDigital: true,
            priceCents: { lte: variant.priceCents } // rough matching
          }
        });
        return res.json({ serviceable: false, fallbackVariantId: digitalFallback?.id });
      }
    }

    return res.json({ serviceable: true });
  } catch (error) {
    console.error('POST /recipient/:token/check-pincode', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// 3. Redeem Gift
const redeemSchema = z.object({
  variantId: z.string(),
  address: z.string().min(10, 'Please provide a complete address'),
  phone: z.string().min(10, 'Please provide a valid phone number'),
  pincode: z.string().length(6, 'Please provide a valid 6-digit pincode')
});

recipientRouter.post('/:token/redeem', async (req, res) => {
  try {
    const rawToken = req.params.token;
    if (!rawToken || rawToken.length !== 32) return notAvailable(res);
    
    const data = redeemSchema.parse(req.body);
    const tokenHash = hashToken(rawToken);

    const resultOrder = await prisma.$transaction(async (tx) => {
      const recipient = await tx.recipient.findUnique({
        where: { tokenHash },
        include: { campaign: true }
      });

      if (!recipient || recipient.status !== 'VIEWED') {
        throw new Error('Gift is not available for redemption');
      }

      if (recipient.campaign.expiresAt < new Date()) {
        throw new Error('Gift has expired');
      }

      const variant = await tx.variant.findUnique({
        where: { id: data.variantId }
      });

      if (!variant) throw new Error('Selected gift is not available');

      // 1. Encrypt Address Payload
      const addressPayload = JSON.stringify({
        address: data.address,
        phone: data.phone,
        pincode: data.pincode
      });
      const encryptedAddress = encryptData(addressPayload);

      // 2. Ledger Math
      const wallet = await tx.wallet.findUnique({
        where: { organizationId: recipient.campaign.organizationId }
      });

      if (!wallet) throw new Error('Organization wallet not found');

      // Calculate the original held amount for this recipient
      let heldPerRecipient = 0;
      if (recipient.campaign.mode === 'CHOICE') {
        heldPerRecipient = recipient.campaign.budgetCentsPerRecipient || 0;
      } else {
        // SINGLE mode: we need to find the max variant price. 
        // This is tricky inside the tx without re-fetching all campaign products.
        // For Epic F, we will assume it's stored or we recalculate.
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

      const actualBase = variant.priceCents;
      const actualFee = Math.floor((actualBase * recipient.campaign.serviceFeeBps) / 10000);
      const actualChargeAmount = BigInt(actualBase + actualFee);

      // 3. Update Ledger (HOLD_RELEASE then CHARGE)
      let currentBalance = wallet.balanceCents;
      let currentHeld = wallet.heldCents;

      // HOLD_RELEASE
      currentHeld -= totalHeldAmount;
      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          amountCents: totalHeldAmount,
          type: 'HOLD_RELEASE',
          referenceType: 'RECIPIENT',
          referenceId: recipient.id,
          balanceAfterCents: currentBalance,
          heldAfterCents: currentHeld
        }
      });

      // CHARGE
      currentBalance -= actualChargeAmount;
      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          amountCents: -actualChargeAmount,
          type: 'CHARGE',
          referenceType: 'ORDER',
          referenceId: recipient.id, // Using recipient ID temporarily until order is created
          balanceAfterCents: currentBalance,
          heldAfterCents: currentHeld
        }
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: currentBalance, heldCents: currentHeld }
      });

      // 4. Update Recipient & Create Order
      await tx.recipient.update({
        where: { id: recipient.id },
        data: {
          status: 'REDEEMED',
          redeemedVariantId: variant.id,
          redeemedAt: new Date(),
          address: encryptedAddress
        }
      });

      const newOrder = await tx.order.create({
        data: {
          organizationId: recipient.campaign.organizationId,
          campaignId: recipient.campaign.id,
          recipientId: recipient.id,
          variantId: variant.id,
          priceCents: variant.priceCents,
          status: 'PENDING',
          idempotencyKey: `redeem_${recipient.id}`
        }
      });
      
      // We can't queue inside the transaction directly if we want to be safe, 
      // but returning the order ID allows us to queue it after.
      return newOrder;
    });

    // 5. Enqueue fulfillment job
    await FulfillmentService.enqueueFulfillment(resultOrder.id);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('POST /recipient/:token/redeem', error);
    return res.status(400).json({ error: error.message });
  }
});

// 4. Opt-out
recipientRouter.post('/:token/opt-out', async (req, res) => {
  try {
    const rawToken = req.params.token;
    if (!rawToken || rawToken.length !== 32) return notAvailable(res);
    
    const tokenHash = hashToken(rawToken);

    await prisma.$transaction(async (tx) => {
      const recipient = await tx.recipient.findUnique({
        where: { tokenHash },
        include: { campaign: true }
      });

      if (!recipient || recipient.status !== 'VIEWED') {
        throw new Error('Gift is not available for opt-out');
      }

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
          referenceType: 'RECIPIENT_OPTOUT',
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
        data: {
          status: 'OPTED_OUT',
          optOutAt: new Date()
        }
      });
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('POST /recipient/:token/opt-out', error);
    return res.status(400).json({ error: error.message });
  }
});
