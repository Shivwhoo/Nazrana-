import { Router } from 'express';
import { z } from 'zod';
import { createOrgSchema } from '@gifting/shared';
import { OrgService } from '../services/org.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { prisma } from '../prisma';
import { logError } from '../utils/logger';

export const orgsRouter = Router();

// Protected routes below
orgsRouter.use(authMiddleware);

orgsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createOrgSchema.parse(req.body);
    const userId = req.user!.id;

    // Check if user already owns an org (optional, but typically 1 org per user for simplicity)
    const existing = await prisma.membership.findFirst({
      where: { userId, role: 'OWNER' }
    });

    // In a multi-tenant setup, they could have many, but let's allow it for now.
    const org = await OrgService.createOrganization(userId, data);
    return res.status(201).json({ org });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logError('POST /orgs', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Require user to be any member of the org to view it
orgsRouter.get('/:orgId', requireRole(['OWNER', 'ADMIN', 'MEMBER', 'FINANCE']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const org = await OrgService.getOrganization(orgId);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    return res.status(200).json({ org });
  } catch (error) {
    logError('GET /orgs/:orgId', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List orgs for current user
orgsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: { organization: true }
    });
    return res.status(200).json({ orgs: memberships.map(m => m.organization) });
  } catch (error) {
    logError('GET /orgs', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
