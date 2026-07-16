import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logError } from '../utils/logger';

export interface VendorAuthRequest extends Request {
  vendorId?: string;
  vendorUserId?: string;
}

export const vendorAuthMiddleware = (req: VendorAuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret = process.env.AUTH_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as any;
    
    if (decoded.aud !== 'vendor') {
      return res.status(401).json({ error: 'Invalid token audience. Expected vendor.' });
    }

    req.vendorUserId = decoded.sub;
    req.vendorId = decoded.vendorId;
    
    next();
  } catch (error) {
    logError('Vendor Auth middleware', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};
