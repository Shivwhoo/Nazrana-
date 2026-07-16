import { Router } from 'express';
import { prisma } from '../../prisma';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { logError } from '../../utils/logger';

export const adminMetricsRouter = Router();
adminMetricsRouter.use(authMiddleware);

function requirePlatformAdmin(req: AuthRequest, res: any, next: any) {
  if (!req.user?.isPlatformAdmin) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Platform admin access required' });
  }
  next();
}
adminMetricsRouter.use(requirePlatformAdmin);

adminMetricsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const [
      totalOrgs,
      activeCampaigns,
      totalOrders,
      totalVendors,
      totalProducts
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.campaign.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count(),
      prisma.vendor.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({ where: { status: 'ACTIVE' } })
    ]);

    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        variant: { include: { product: true } },
        campaign: { include: { organization: true } }
      }
    });

    return res.json({
      metrics: {
        totalOrgs,
        activeCampaigns,
        totalOrders,
        totalVendors,
        totalProducts
      },
      recentOrders
    });
  } catch (error) {
    logError('GET /admin/metrics', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});
