import { prisma } from '../prisma';
import { Queue } from 'bullmq';
import { createRedisClient, QUEUES } from '@gifting/shared/src/redis';

const fanoutQueue = new Queue(QUEUES.CAMPAIGN_FANOUT, { connection: createRedisClient() as any });

export class ActivationService {
  static async activateCampaign(orgId: string, campaignId: string, userId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch Campaign and lock row if possible, but prisma doesn't support generic row locking easily outside raw queries.
      // We will do our checks and updates in a transaction.
      const campaign = await tx.campaign.findUnique({
        where: { id: campaignId, organizationId: orgId },
        include: {
          products: {
            include: {
              product: {
                include: { variants: true }
              }
            }
          }
        }
      });

      if (!campaign) throw new Error('Campaign not found');
      if (campaign.status !== 'DRAFT') throw new Error('Campaign is not in DRAFT status');

      // 2. Count recipients
      const recipientCount = await tx.recipient.count({
        where: { campaignId }
      });

      if (recipientCount === 0) {
        throw new Error('Cannot activate a campaign with 0 recipients');
      }

      // 3. Calculate max cost per head
      let maxCostPerHead = 0;
      if (campaign.mode === 'CHOICE') {
        if (!campaign.budgetCentsPerRecipient) throw new Error('CHOICE campaign requires a budget');
        maxCostPerHead = campaign.budgetCentsPerRecipient;
      } else {
        // SINGLE mode: max price of the variants in the single product
        if (campaign.products.length !== 1) throw new Error('SINGLE campaign must have exactly one product');
        const variants = campaign.products[0].product.variants;
        if (variants.length === 0) throw new Error('Product has no variants');
        maxCostPerHead = Math.max(...variants.map(v => v.priceCents));
      }

      // Total calculation
      const baseCost = maxCostPerHead * recipientCount;
      const serviceFee = Math.floor((baseCost * campaign.serviceFeeBps) / 10000);
      const totalCostCents = BigInt(baseCost + serviceFee);

      // 4. Check wallet
      const wallet = await tx.wallet.findUnique({
        where: { organizationId: orgId }
      });

      if (!wallet) throw new Error('Wallet not found');

      const availableBalance = wallet.balanceCents - wallet.heldCents;
      if (availableBalance < totalCostCents) {
        throw new Error(`Insufficient funds. Required: ${totalCostCents}, Available: ${availableBalance}`);
      }

      // 5. Update Wallet
      const newHeldCents = wallet.heldCents + totalCostCents;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { heldCents: newHeldCents }
      });

      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          amountCents: totalCostCents,
          type: 'HOLD',
          referenceType: 'CAMPAIGN',
          referenceId: campaign.id,
          balanceAfterCents: wallet.balanceCents, // Balance doesn't change on HOLD
          heldAfterCents: newHeldCents
        }
      });

      // 6. Update Campaign Status
      const updatedCampaign = await tx.campaign.update({
        where: { id: campaign.id },
        data: { status: 'ACTIVE' }
      });

      // 7. Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          actorId: userId,
          action: 'CAMPAIGN_ACTIVATED',
          targetType: 'CAMPAIGN',
          targetId: campaign.id,
          metadata: { totalCostCents: totalCostCents.toString(), recipientCount }
        }
      });

      // 8. Queue fanout job (We enqueue it now, it will run after transaction commits)
      await fanoutQueue.add('fanout', { campaignId: campaign.id });

      return updatedCampaign;
    });
  }
}
