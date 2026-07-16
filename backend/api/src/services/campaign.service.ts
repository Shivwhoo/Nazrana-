import { prisma } from '../prisma';
import { CreateCampaignInput, UpdateCampaignInput, AddCampaignProductInput } from '@gifting/shared';

export class CampaignService {
  static async createCampaign(orgId: string, userId: string, data: CreateCampaignInput) {
    return await prisma.campaign.create({
      data: {
        organizationId: orgId,
        createdById: userId,
        name: data.name,
        mode: data.mode,
        budgetCentsPerRecipient: data.budgetCentsPerRecipient,
        messageTemplate: 'Hi {{firstName}},\n\nHere is a gift for you!',
        branding: {},
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      }
    });
  }

  static async getCampaign(orgId: string, campaignId: string) {
    return await prisma.campaign.findUnique({
      where: { id: campaignId, organizationId: orgId },
      include: {
        products: {
          include: { product: true }
        }
      }
    });
  }

  static async updateCampaign(orgId: string, campaignId: string, data: UpdateCampaignInput) {
    const updateData: any = { ...data };
    if (data.expiresAt) {
      updateData.expiresAt = new Date(data.expiresAt);
    }
    
    return await prisma.campaign.update({
      where: { id: campaignId, organizationId: orgId },
      data: updateData
    });
  }

  static async addProduct(orgId: string, campaignId: string, data: AddCampaignProductInput) {
    // Ensure campaign belongs to org
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, organizationId: orgId }
    });
    if (!campaign) throw new Error('Campaign not found');

    const existing = await prisma.campaignProduct.findUnique({
      where: {
        campaignId_productId: {
          campaignId,
          productId: data.productId
        }
      },
      include: { product: true }
    });

    if (existing) {
      return existing; // Already in campaign, return it gracefully
    }

    return await prisma.campaignProduct.create({
      data: {
        campaignId,
        productId: data.productId
      },
      include: { product: true }
    });
  }

  static async removeProduct(orgId: string, campaignId: string, productId: string) {
    // Delete if exists and matches
    const cp = await prisma.campaignProduct.findUnique({
      where: {
        campaignId_productId: {
          campaignId,
          productId
        }
      },
      include: { campaign: true }
    });

    if (!cp || cp.campaign.organizationId !== orgId) {
      throw new Error('Not found');
    }

    return await prisma.campaignProduct.delete({
      where: { id: cp.id }
    });
  }
}
