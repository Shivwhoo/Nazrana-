import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../prisma';
import { Role } from '@prisma/client';
import { logError } from '../utils/logger';

export const requireRole = (allowedRoles: Role[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // If they are a platform admin, bypass org role checks for now
      // depending on requirements, but usually we restrict org routes to org users.
      // The prompt says "PLATFORM_ADMIN is separate from org roles".
      if (req.user.isPlatformAdmin) {
        return next();
      }

      const orgId = req.params.orgId || req.body.orgId || req.query.orgId;
      
      if (!orgId || typeof orgId !== 'string') {
        return res.status(400).json({ error: 'Organization ID is required' });
      }

      const membership = await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: req.user.id
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Access denied: Not a member of this organization' });
      }

      if (!allowedRoles.includes(membership.role)) {
        return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
      }

      // Pass membership down if needed
      (req as any).membership = membership;
      next();
    } catch (error) {
      logError('RBAC middleware', error);
      res.status(500).json({ error: 'Internal server error during permission check' });
    }
  };
};

export const requirePlatformAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.user.isPlatformAdmin) return res.status(403).json({ error: 'Platform admin only' });
  next();
};
