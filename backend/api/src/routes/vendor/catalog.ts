import { Router } from 'express';
import { VendorCatalogService } from '../../services/vendor-catalog.service';

export const vendorCatalogRouter = Router();

// GET /api/vendor/catalog
vendorCatalogRouter.get('/', async (req, res) => {
  try {
    const vendorId = (req as any).vendorId;
    const products = await VendorCatalogService.listOwnProducts(vendorId);
    return res.json(products);
  } catch (error) {
    console.error('GET /api/vendor/catalog error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/vendor/catalog
vendorCatalogRouter.post('/', async (req, res) => {
  try {
    const vendorId = (req as any).vendorId;
    const vendorUserId = (req as any).vendorUserId;
    const product = await VendorCatalogService.createProduct(vendorId, vendorUserId, req.body);
    return res.json(product);
  } catch (error: any) {
    console.error('POST /api/vendor/catalog error:', error);
    return res.status(400).json({ error: error.message || 'Bad Request' });
  }
});

// PUT /api/vendor/catalog/:productId
vendorCatalogRouter.put('/:productId', async (req, res) => {
  try {
    const vendorId = (req as any).vendorId;
    const { productId } = req.params;
    const product = await VendorCatalogService.updateProduct(vendorId, productId, req.body);
    return res.json(product);
  } catch (error: any) {
    console.error('PUT /api/vendor/catalog error:', error);
    return res.status(400).json({ error: error.message || 'Bad Request' });
  }
});

// DELETE /api/vendor/catalog/:productId
vendorCatalogRouter.delete('/:productId', async (req, res) => {
  try {
    const vendorId = (req as any).vendorId;
    const { productId } = req.params;
    await VendorCatalogService.deleteProduct(vendorId, productId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/vendor/catalog error:', error);
    return res.status(400).json({ error: error.message || 'Bad Request' });
  }
});
