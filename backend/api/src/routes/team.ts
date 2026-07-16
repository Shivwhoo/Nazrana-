import { Router } from 'express';
import { z } from 'zod';
import { inviteTeamMemberSchema } from '@gifting/shared';
import { TeamService } from '../services/team.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { prisma } from '../prisma';
import { logError } from '../utils/logger';

export const teamRouter = Router({ mergeParams: true }); // Important: to get orgId from parent router

teamRouter.use(authMiddleware);

// Get all members of an org
teamRouter.get('/', requireRole(['OWNER', 'ADMIN', 'MEMBER', 'FINANCE']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const members = await prisma.membership.findMany({
      where: { organizationId: orgId },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    return res.status(200).json({ members });
  } catch (error) {
    logError('GET /team', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Only OWNER or ADMIN can invite members
teamRouter.post('/invites', requireRole(['OWNER', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const inviterId = req.user!.id;
    const data = inviteTeamMemberSchema.parse(req.body);

    const membership = await TeamService.inviteMember(orgId, inviterId, data);
    return res.status(201).json({ membership });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logError('POST /team/invites', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Only OWNER or ADMIN can update roles
teamRouter.put('/members/:userId', requireRole(['OWNER', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const targetUserId = req.params.userId;
    const inviterId = req.user!.id;
    const data = z.object({ role: z.enum(['ADMIN', 'MEMBER', 'FINANCE']) }).parse(req.body);

    const membership = await prisma.membership.update({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: targetUserId
        }
      },
      data: { role: data.role }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorId: inviterId,
        action: 'MEMBER_ROLE_UPDATED',
        targetType: 'USER',
        targetId: targetUserId,
        metadata: { role: data.role }
      }
    });

    return res.status(200).json({ membership });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logError('PUT /team/members/:userId', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
