import { prisma } from '../prisma';
import { CreateOrgInput } from '@gifting/shared';

export class OrgService {
  static async createOrganization(userId: string, data: CreateOrgInput) {
    // Start a transaction: create org and add user as OWNER
    return await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.name,
          gstin: data.gstin,
          stateCode: data.stateCode,
          settings: {},
          brandingDefaults: {},
        }
      });

      await tx.membership.create({
        data: {
          role: 'OWNER',
          organizationId: org.id,
          userId: userId
        }
      });

      // Initialize an empty wallet for the org
      await tx.wallet.create({
        data: {
          organizationId: org.id,
          balanceCents: 0,
          heldCents: 0
        }
      });

      await tx.auditLog.create({
        data: {
          organizationId: org.id,
          actorId: userId,
          action: 'ORG_CREATED',
          targetType: 'ORGANIZATION',
          targetId: org.id,
          metadata: { name: org.name, gstin: org.gstin }
        }
      });

      return org;
    });
  }

  static async getOrganization(orgId: string) {
    return await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        wallet: true
      }
    });
  }
}
