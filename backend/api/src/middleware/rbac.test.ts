import { describe, it, expect, vi } from 'vitest';
import { requireRole } from './rbac';
import { prisma } from '../prisma';

vi.mock('../prisma', () => ({
  prisma: {
    membership: {
      findUnique: vi.fn(),
    },
  },
}));

describe('RBAC Middleware', () => {
  it('should return 401 if user is not authenticated', async () => {
    const middleware = requireRole(['ADMIN']);
    const req = { params: { orgId: 'org1' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 if user is not a member of the org', async () => {
    const middleware = requireRole(['ADMIN']);
    const req = { user: { id: 'user1' }, params: { orgId: 'org1' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    vi.mocked(prisma.membership.findUnique).mockResolvedValue(null);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied: Not a member of this organization' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 if user has insufficient permissions', async () => {
    const middleware = requireRole(['ADMIN']);
    const req = { user: { id: 'user1' }, params: { orgId: 'org1' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: 'MEMBER',
      organizationId: 'org1',
      userId: 'user1',
    } as any);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied: Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next if user has correct permissions', async () => {
    const middleware = requireRole(['ADMIN', 'OWNER']);
    const req = { user: { id: 'user1' }, params: { orgId: 'org1' } } as any;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const next = vi.fn();

    vi.mocked(prisma.membership.findUnique).mockResolvedValue({
      role: 'OWNER',
      organizationId: 'org1',
      userId: 'user1',
    } as any);

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
