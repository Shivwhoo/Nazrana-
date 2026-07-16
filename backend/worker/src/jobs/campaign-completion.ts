import { prisma } from '../../../api/src/prisma';
import { sendEmailWithLog } from '../../../api/src/services/email';

export default async function processCampaignCompletion() {
  console.log('[CAMPAIGN-COMPLETION] Checking for expired active campaigns...');

  const now = new Date();

  // Find campaigns that are ACTIVE and have expired
  const expiredCampaigns = await prisma.campaign.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lt: now }
    },
    include: {
      organization: true,
      recipients: true
    }
  });

  if (expiredCampaigns.length === 0) {
    console.log('[CAMPAIGN-COMPLETION] No expired active campaigns found.');
    return;
  }

  console.log(`[CAMPAIGN-COMPLETION] Found ${expiredCampaigns.length} campaigns to complete.`);

  for (const campaign of expiredCampaigns) {
    try {
      await prisma.$transaction(async (tx) => {
        // Calculate remaining hold to release
        const wallet = await tx.wallet.findUnique({
          where: { organizationId: campaign.organizationId }
        });

        if (!wallet) throw new Error('Wallet not found');

        // Sum up the holds created for this campaign that haven't been released yet.
        // Actually, the easiest way is to calculate exactly how much was initially held,
        // minus any HOLD_RELEASE events for this campaign or its recipients/orders.
        // A safer way is to query all HOLDs minus all HOLD_RELEASEs related to this campaign.
        
        const holds = await tx.walletLedger.findMany({
          where: { referenceType: 'CAMPAIGN', referenceId: campaign.id, type: 'HOLD' }
        });
        
        const orders = await tx.order.findMany({ where: { campaignId: campaign.id } });
        const orderIds = orders.map(o => o.id);
        const recipientIds = campaign.recipients.map(r => r.id);

        const releases = await tx.walletLedger.findMany({
          where: {
            type: 'HOLD_RELEASE',
            OR: [
              { referenceType: 'CAMPAIGN', referenceId: campaign.id },
              { referenceType: 'ORDER', referenceId: { in: orderIds } },
              { referenceType: 'RECIPIENT_REMOVED', referenceId: { in: recipientIds } }
            ]
          }
        });

        let totalHold = 0n;
        holds.forEach(h => totalHold += BigInt(h.amountCents));
        
        let totalReleased = 0n;
        releases.forEach(r => totalReleased += BigInt(r.amountCents));

        const remainingHold = totalHold - totalReleased;

        let currentHeld = wallet.heldCents;
        let newBalance = wallet.balanceCents;

        if (remainingHold > 0n) {
          currentHeld = currentHeld - remainingHold;
          
          await tx.walletLedger.create({
            data: {
              walletId: wallet.id,
              amountCents: remainingHold,
              type: 'HOLD_RELEASE',
              referenceType: 'CAMPAIGN',
              referenceId: campaign.id,
              balanceAfterCents: newBalance,
              heldAfterCents: currentHeld
            }
          });

          await tx.wallet.update({
            where: { id: wallet.id },
            data: { heldCents: currentHeld }
          });
        }

        // Update campaign status
        await tx.campaign.update({
          where: { id: campaign.id },
          data: { status: 'COMPLETED' }
        });

        // Add an audit log
        await tx.auditLog.create({
          data: {
            organizationId: campaign.organizationId,
            actorId: 'SYSTEM',
            action: 'CAMPAIGN_COMPLETED',
            targetType: 'CAMPAIGN',
            targetId: campaign.id,
            metadata: { releasedHold: remainingHold.toString() }
          }
        });

        // Invoice Generation Logic
        const validOrders = await tx.order.findMany({
          where: { campaignId: campaign.id, status: { not: 'CANCELLED' } },
          include: { variant: true }
        });

        if (validOrders.length > 0) {
          const lines: any[] = [];
          let totalTaxable = 0;
          let totalIgst = 0;
          let totalAmount = 0;

          const variantMap = new Map<string, { qty: number; variant: any }>();
          for (const o of validOrders) {
            const existing = variantMap.get(o.variantId);
            if (existing) {
              existing.qty += 1;
            } else {
              variantMap.set(o.variantId, { qty: 1, variant: o.variant });
            }
          }

          Array.from(variantMap.values()).forEach(({ qty, variant }) => {
            const unitPrice = variant.priceCents;
            const gstRateBps = variant.gstRateBps || 1800;
            const taxFactor = 1 + (gstRateBps / 10000);
            
            const totalInclusive = unitPrice * qty;
            const taxableValue = Math.round(totalInclusive / taxFactor);
            const igst = totalInclusive - taxableValue;

            totalTaxable += taxableValue;
            totalIgst += igst;
            totalAmount += totalInclusive;

            lines.push({
              sku: variant.sku,
              title: variant.title,
              hsnCode: variant.hsnCode || '9983',
              qty,
              unitPriceCents: unitPrice,
              taxableValueCents: taxableValue,
              gstRateBps,
              igstCents: igst,
              cgstCents: 0,
              sgstCents: 0,
              totalCents: totalInclusive
            });
          });

          const serviceFeeBps = campaign.serviceFeeBps || 500;
          const serviceFeeTaxable = Math.round((totalAmount * serviceFeeBps) / 10000);
          const serviceFeeGst = Math.round(serviceFeeTaxable * 0.18);
          
          totalTaxable += serviceFeeTaxable;
          totalIgst += serviceFeeGst;
          totalAmount += serviceFeeTaxable + serviceFeeGst;

          lines.push({
            sku: 'FEE-PLATFORM',
            title: 'Platform Service Fee',
            hsnCode: '9983',
            qty: 1,
            unitPriceCents: serviceFeeTaxable + serviceFeeGst,
            taxableValueCents: serviceFeeTaxable,
            gstRateBps: 1800,
            igstCents: serviceFeeGst,
            cgstCents: 0,
            sgstCents: 0,
            totalCents: serviceFeeTaxable + serviceFeeGst
          });

          const invoiceNumber = `INV-${campaign.organizationId.substring(0, 4).toUpperCase()}-${Date.now().toString().substring(7)}`;

          const invoice = await tx.invoice.create({
            data: {
              organizationId: campaign.organizationId,
              number: invoiceNumber,
              gstBreakdown: lines,
              totals: {
                taxableValueCents: totalTaxable,
                igstCents: totalIgst,
                cgstCents: 0,
                sgstCents: 0,
                totalAmountCents: totalAmount,
                campaignId: campaign.id
              }
            }
          });
          console.log(`[CAMPAIGN-COMPLETION] Generated Invoice ${invoice.number} for Campaign ${campaign.id}`);
        }

      });

      // Send completion email
      const orgUsers = await prisma.user.findMany({
        where: { memberships: { some: { organizationId: campaign.organizationId, role: { in: ['OWNER', 'ADMIN'] } } } }
      });

      if (orgUsers.length > 0) {
        const owner = orgUsers[0];
        const html = `
          <h2>Campaign Completed</h2>
          <p>Your campaign <strong>${campaign.name}</strong> has expired and is now marked as COMPLETED.</p>
          <p>Any unredeemed budget has been released back into your wallet balance.</p>
          <p>You can view the final analytics on your dashboard.</p>
        `;
        
        await sendEmailWithLog({
          to: owner.email,
          subject: `Campaign Completed: ${campaign.name}`,
          html
        }, 'CAMPAIGN', campaign.id, 'CAMPAIGN_COMPLETION');
      }

      console.log(`[CAMPAIGN-COMPLETION] Successfully completed campaign ${campaign.id}`);

    } catch (err: any) {
      console.error(`[CAMPAIGN-COMPLETION] Error completing campaign ${campaign.id}:`, err.message);
    }
  }
}
