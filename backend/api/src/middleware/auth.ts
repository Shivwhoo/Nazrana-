import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logError } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    isPlatformAdmin: boolean;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.AUTH_SECRET || 'secret';
    // Auth.js uses a specific token format, but if we're doing a simple JWT strategy with a shared secret:
    // Actually, Auth.js JWTs are JWE (encrypted) by default unless configured to use raw JWT.
    // Assuming we configure NextAuth to use raw JWT with `jsonwebtoken`, we can verify it here.
    const decoded = jwt.verify(token, secret) as any;
    
    req.user = {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      isPlatformAdmin: decoded.isPlatformAdmin || false,
    };
    next();
  } catch (error) {
    logError('Auth middleware', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
