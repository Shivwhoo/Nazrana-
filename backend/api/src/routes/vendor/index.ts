import { Router } from 'express';
import { vendorAuthRouter } from './auth';
import { vendorCatalogRouter } from './catalog';
import { vendorOrdersRouter } from './orders';
import { vendorProfileRouter } from './profile';
import { vendorUploadsRouter } from './uploads';
import { vendorAuthMiddleware } from '../../middleware/vendorAuth';

export const vendorRouter = Router();

// Auth routes (login, reset-password, invite-info) do not require the vendorAuthMiddleware generally,
// or they handle it themselves (like /me might require it).
vendorRouter.use('/auth', vendorAuthRouter);

// Protected routes
vendorRouter.use(vendorAuthMiddleware);
vendorRouter.use('/catalog', vendorCatalogRouter);
vendorRouter.use('/orders', vendorOrdersRouter);
vendorRouter.use('/profile', vendorProfileRouter);
vendorRouter.use('/uploads', vendorUploadsRouter);
