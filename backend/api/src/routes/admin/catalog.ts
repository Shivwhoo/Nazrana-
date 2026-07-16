import { Router } from 'express';
import { z } from 'zod';
import {
  createVendorSchema,
  updateVendorSchema,
  createProductSchema,
  updateProductSchema,
  createCollectionSchema,
} from '@gifting/shared';
import { CatalogService } from '../../services/catalog.service';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { logError } from '../../utils/logger';

export const adminCatalogRouter = Router();
adminCatalogRouter.use(authMiddleware);

// Guard: PLATFORM_ADMIN only
function requirePlatformAdmin(req: AuthRequest, res: any, next: any) {
  if (!req.user?.isPlatformAdmin) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Platform admin access required' });
  }
  next();
}

adminCatalogRouter.use(requirePlatformAdmin);

// ─── Vendors ────────────────────────────────────────────────────────────────

adminCatalogRouter.get('/vendors', async (req: AuthRequest, res) => {
  try {
    const vendors = await CatalogService.listVendors();
    return res.json({ vendors });
  } catch (error) {
    logError('GET /admin/catalog/vendors', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

adminCatalogRouter.post('/vendors', async (req: AuthRequest, res) => {
  try {
    const data = createVendorSchema.parse(req.body);
    const vendor = await CatalogService.createVendor(data as any);
    return res.status(201).json({ vendor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid data', details: error.errors });
    }
    logError('POST /admin/catalog/vendors', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

adminCatalogRouter.put('/vendors/:id', async (req: AuthRequest, res) => {
  try {
    const data = updateVendorSchema.parse(req.body);
    const vendor = await CatalogService.updateVendor(req.params.id, data as any);
    return res.json({ vendor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid data', details: error.errors });
    }
    logError('PUT /admin/catalog/vendors/:id', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

adminCatalogRouter.delete('/vendors/:id', async (req: AuthRequest, res) => {
  try {
    await CatalogService.deleteVendor(req.params.id);
    return res.json({ success: true });
  } catch (error) {
    logError('DELETE /admin/catalog/vendors/:id', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

// ─── Products ────────────────────────────────────────────────────────────────

adminCatalogRouter.get('/products', async (req: AuthRequest, res) => {
  try {
    const products = await CatalogService.listAllProducts();
    return res.json({ products });
  } catch (error) {
    logError('GET /admin/catalog/products', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

adminCatalogRouter.post('/products', async (req: AuthRequest, res) => {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await CatalogService.createProduct(data);
    return res.status(201).json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid data', details: error.errors });
    }
    logError('POST /admin/catalog/products', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

adminCatalogRouter.put('/products/:id', async (req: AuthRequest, res) => {
  try {
    const data = updateProductSchema.parse(req.body);
    const product = await CatalogService.updateProduct(req.params.id, data);
    return res.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid data', details: error.errors });
    }
    logError('PUT /admin/catalog/products/:id', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

// ─── Collections ─────────────────────────────────────────────────────────────

adminCatalogRouter.post('/collections', async (req: AuthRequest, res) => {
  try {
    const { name, description, productIds } = createCollectionSchema.parse(req.body);
    const collection = await CatalogService.createCollection(name, description, productIds);
    return res.status(201).json({ collection });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid data', details: error.errors });
    }
    logError('POST /admin/catalog/collections', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

adminCatalogRouter.post('/collections/:id/products', async (req: AuthRequest, res) => {
  try {
    const { productId } = z.object({ productId: z.string().uuid() }).parse(req.body);
    const item = await CatalogService.addProductToCollection(req.params.id, productId);
    return res.status(201).json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid data', details: error.errors });
    }
    logError('POST /admin/catalog/collections/:id/products', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

adminCatalogRouter.delete('/collections/:id/products/:productId', async (req: AuthRequest, res) => {
  try {
    await CatalogService.removeProductFromCollection(req.params.id, req.params.productId);
    return res.json({ success: true });
  } catch (error) {
    logError('DELETE /admin/catalog/collections/:id/products/:productId', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});
