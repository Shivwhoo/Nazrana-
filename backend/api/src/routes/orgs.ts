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

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  gstin: z.string().length(15).optional(),
  stateCode: z.string().length(2).optional(),
  brandingDefaults: z.object({
    logoUrl: z.string().url().optional().nullable(),
    accentColor: z.string().optional(),
  }).optional(),
});

orgsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const data = createOrgSchema.parse(req.body);
    const userId = req.user!.id;

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

// Update organization settings
orgsRouter.put('/:orgId', requireRole(['OWNER', 'ADMIN']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const data = updateOrgSchema.parse(req.body);

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.gstin) updateData.gstin = data.gstin;
    if (data.stateCode) updateData.stateCode = data.stateCode;
    if (data.brandingDefaults) {
      const existing = await prisma.organization.findUnique({ where: { id: orgId } });
      updateData.brandingDefaults = {
        ...(existing?.brandingDefaults as any || {}),
        ...data.brandingDefaults,
      };
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    return res.json({ org });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logError('PUT /orgs/:orgId', error);
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