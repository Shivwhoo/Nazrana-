import crypto from 'crypto';
import { prisma } from '../prisma';
import { InviteTeamMemberInput } from '@gifting/shared';
import { sendEmail, inviteEmailHtml } from './email';

const INVITE_EXPIRY_DAYS = 7;

function generateInviteToken(): { raw: string; hashed: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hashed };
}

export class TeamService {
  static async inviteMember(orgId: string, inviterId: string, data: InviteTeamMemberInput) {
    const { raw: rawToken, hashed: hashedToken } = generateInviteToken();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + INVITE_EXPIRY_DAYS);

    const membership = await prisma.$transaction(async (tx) => {
      // 1. Check if user exists by email
      let user = await tx.user.findUnique({ where: { email: data.email } });

      // If they don't exist, create a stub user (they'll complete profile on signup)
      if (!user) {
        user = await tx.user.create({ data: { email: data.email } });
      }

      // 2. Upsert membership with a fresh invite token
      const membership = await tx.membership.upsert({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: user.id
          }
        },
        update: {
          role: data.role,
          inviteToken: hashedToken,
          inviteTokenExpiry: expiry,
          acceptedAt: null, // reset if re-inviting
        },
        create: {
          organizationId: orgId,
          userId: user.id,
          role: data.role,
          inviteToken: hashedToken,
          inviteTokenExpiry: expiry,
        }
      });

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          actorId: inviterId,
          action: 'MEMBER_INVITED',
          targetType: 'USER',
          targetId: user.id,
          metadata: { role: data.role, email: data.email }
        }
      });

      return membership;
    });

    // 4. Send invite email with the raw token (AFTER transaction)
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    const inviter = await prisma.user.findUnique({ where: { id: inviterId } });
    const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/accept?token=${rawToken}`;

    sendEmail({
      to: data.email,
      subject: `You've been invited to join ${org?.name || 'an organization'}`,
      html: inviteEmailHtml(org?.name || 'an organization', inviter?.email || '', data.role, acceptUrl),
    }).catch(() => {}); // Fire-and-forget

    return membership;
  }

  /**
   * Accept an invite using the raw token from the email link.
   */
  static async acceptInvite(rawToken: string, userId: string) {
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const membership = await prisma.membership.findFirst({
      where: { inviteToken: hashedToken },
      include: { organization: true }
    });

    if (!membership) {
      throw new Error('INVALID_TOKEN');
    }
    if (membership.inviteTokenExpiry && membership.inviteTokenExpiry < new Date()) {
      throw new Error('TOKEN_EXPIRED');
    }
    if (membership.acceptedAt) {
      // Already accepted — idempotent
      return membership;
    }

    return prisma.$transaction(async (tx) => {
      // Move the membership to the accepting user if different
      const updated = await tx.membership.update({
        where: { id: membership.id },
        data: {
          userId,
          acceptedAt: new Date(),
          inviteToken: null,
          inviteTokenExpiry: null,
        },
        include: { organization: true }
      });

      await tx.auditLog.create({
        data: {
          organizationId: membership.organizationId,
          actorId: userId,
          action: 'INVITE_ACCEPTED',
          targetType: 'MEMBERSHIP',
          targetId: membership.id,
          metadata: { role: membership.role }
        }
      });

      return updated;
    });
  }
}
