import { Router } from 'express';
import { prisma } from '../../prisma';
const bcrypt = require('bcryptjs');
import jwt from 'jsonwebtoken';
import { vendorAuthMiddleware } from '../../middleware/vendorAuth';

export const vendorAuthRouter = Router();

// /api/vendor/auth/login
vendorAuthRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await prisma.vendorUser.findFirst({ 
      where: { email },
      include: { vendor: true }
    });
    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const secret = process.env.AUTH_SECRET || 'secret';
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        vendorId: user.vendorId,
        aud: 'vendor'
      },
      secret,
      { expiresIn: '7d' }
    );

    return res.json({ token, user: { id: user.id, email: user.email, name: user.vendor?.name || user.email, vendorId: user.vendorId } });
  } catch (error) {
    console.error('Vendor login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// /api/vendor/auth/me
vendorAuthRouter.get('/me', vendorAuthMiddleware, async (req, res) => {
  try {
    const user = await prisma.vendorUser.findUnique({
      where: { id: (req as any).vendorUserId },
      include: { vendor: true }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.vendor?.name || user.email,
        vendorId: user.vendorId,
        vendor: user.vendor
      }
    });
  } catch (error) {
    console.error('Vendor me error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
