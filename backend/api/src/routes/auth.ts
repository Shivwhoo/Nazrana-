import { Router } from 'express';
// @ts-ignore
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { z } from 'zod';
import { loginSchema, registerSchema } from '@gifting/shared';
import jwt from 'jsonwebtoken';
import { logError } from '../utils/logger';
import { TeamService } from '../services/team.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    const hashedPassword = await bcrypt.hash(data.password, 10);

    if (existing) {
      if (existing.name || existing.password) {
        return res.status(400).json({ error: 'User already exists' });
      } else {
        // Complete the stub user (was pre-created by invite)
        const user = await prisma.user.update({
          where: { id: existing.id },
          data: { name: data.name, password: hashedPassword }
        });
        const token = jwt.sign(
          { sub: user.id, email: user.email, isPlatformAdmin: user.isPlatformAdmin },
          process.env.AUTH_SECRET || 'secret',
          { expiresIn: '7d' }
        );
        return res.status(200).json({ user, token });
      }
    } else {
      const user = await prisma.user.create({
        data: { email: data.email, name: data.name, password: hashedPassword }
      });
      const token = jwt.sign(
        { sub: user.id, email: user.email, isPlatformAdmin: user.isPlatformAdmin },
        process.env.AUTH_SECRET || 'secret',
        { expiresIn: '7d' }
      );
      return res.status(200).json({ user, token });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logError('POST /auth/register', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { sub: user.id, email: user.email, isPlatformAdmin: user.isPlatformAdmin },
      process.env.AUTH_SECRET || 'secret',
      { expiresIn: '7d' }
    );
    return res.status(200).json({ user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logError('POST /auth/login', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/accept-invite
 * Accepts an invite token and joins the user to the org.
 * Requires an authenticated user (logged in or just registered).
 */
authRouter.post('/accept-invite', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { token } = z.object({ token: z.string().min(1) }).parse(req.body);
    const membership = await TeamService.acceptInvite(token, req.user!.id);
    return res.json({ membership, orgId: membership.organizationId });
  } catch (error: any) {
    if (error.message === 'INVALID_TOKEN') {
      return res.status(400).json({ code: 'INVALID_TOKEN', message: 'Invite link is invalid or has already been used' });
    }
    if (error.message === 'TOKEN_EXPIRED') {
      return res.status(400).json({ code: 'TOKEN_EXPIRED', message: 'This invite link has expired. Ask the sender to re-invite you.' });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logError('POST /auth/accept-invite', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/invite-info?token=xxx
 * Returns org name + role for an invite token (used to show info before accepting).
 * Public — no auth required so unauthenticated users can see the invite before registering.
 */
authRouter.get('/invite-info', async (req, res) => {
  try {
    const { token } = z.object({ token: z.string().min(1) }).parse(req.query);
    const crypto = await import('crypto');
    const hashedToken = crypto.createHash('sha256').update(token as string).digest('hex');

    const membership = await prisma.membership.findFirst({
      where: { inviteToken: hashedToken },
      include: { organization: { select: { name: true } } }
    });

    if (!membership || (membership.inviteTokenExpiry && membership.inviteTokenExpiry < new Date())) {
      return res.status(404).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired invite' });
    }

    return res.json({
      orgName: membership.organization.name,
      role: membership.role,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    logError('GET /auth/invite-info', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
