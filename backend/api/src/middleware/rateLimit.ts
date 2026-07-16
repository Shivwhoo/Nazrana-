import { Request, Response, NextFunction } from 'express';
import { createRedisClient } from '@gifting/shared/src/redis';

// Create a standalone redis client for rate limiting
const redis = createRedisClient();

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

export function rateLimiter(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Get IP address (trust proxy should be true if behind LB)
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // We use the path and IP to form the Redis key
    // E.g. rate-limit:/api/recipient:192.168.1.1
    // We can just use the route prefix to rate limit the whole recipient scope
    const routeScope = req.baseUrl || req.path;
    const key = `rate-limit:${routeScope}:${ip}`;
    
    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        // Set expiry on the first request in the window
        await redis.pexpire(key, options.windowMs);
      }
      
      if (current > options.max) {
        return res.status(429).json({ error: options.message });
      }
      
      next();
    } catch (error) {
      // If Redis fails, we should probably allow the request (fail open) rather than blocking everything,
      // or log the error and pass it on.
      console.error('[RateLimit] Redis error:', error);
      next();
    }
  };
}
