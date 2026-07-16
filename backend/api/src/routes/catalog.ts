import { Router } from 'express';
import { z } from 'zod';
import { catalogQuerySchema } from '@gifting/shared';
import { CatalogService } from '../services/catalog.service';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logError } from '../utils/logger';

export const catalogRouter = Router();

// All catalog endpoints require org-level authentication
catalogRouter.use(authMiddleware);

/**
 * GET /api/catalog/products
 * List active products with search, category, price-band, and cursor pagination.
 */
catalogRouter.get('/products', async (req: AuthRequest, res) => {
  try {
    const query = catalogQuerySchema.parse(req.query);
    const result = await CatalogService.listProducts(query);
    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid query', details: error.errors });
    }
    logError('GET /catalog/products', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

/**
 * GET /api/catalog/products/:id
 * Get a single product detail with all variants.
 */
catalogRouter.get('/products/:id', async (req: AuthRequest, res) => {
  try {
    const product = await CatalogService.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' });
    }
    return res.json({ product });
  } catch (error) {
    logError('GET /catalog/products/:id', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

/**
 * GET /api/catalog/collections
 * List all collections.
 */
catalogRouter.get('/collections', async (req: AuthRequest, res) => {
  try {
    const collections = await CatalogService.listCollections();
    return res.json({ collections });
  } catch (error) {
    logError('GET /catalog/collections', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

/**
 * GET /api/catalog/collections/:id/products
 * Get products in a specific collection.
 */
catalogRouter.get('/collections/:id/products', async (req: AuthRequest, res) => {
  try {
    const query = catalogQuerySchema.parse(req.query);
    const result = await CatalogService.getCollectionProducts(req.params.id, query);
    return res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid query', details: error.errors });
    }
    logError('GET /catalog/collections/:id/products', error);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});
