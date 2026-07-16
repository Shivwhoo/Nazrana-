import { Router } from 'express';
import { prisma } from '../../prisma';

export const vendorProfileRouter = Router();

// GET /api/vendor/profile
vendorProfileRouter.get('/', async (req, res) => {
  try {
    const vendorId = (req as any).vendorId;
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    
    return res.json(vendor);
  } catch (error) {
    console.error('GET /api/vendor/profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/vendor/profile
vendorProfileRouter.put('/', async (req, res) => {
  try {
    const vendorId = (req as any).vendorId;
    const { contact, serviceablePincodes, cutoffDates, payoutDetails } = req.body;

    // Only allow updating safe fields
    const updatedVendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        ...(contact !== undefined && { contact }),
        ...(serviceablePincodes !== undefined && { serviceablePincodes }),
        ...(cutoffDates !== undefined && { cutoffDates }),
        ...(payoutDetails !== undefined && { payoutDetails }),
      },
    });

    return res.json(updatedVendor);
  } catch (error: any) {
    console.error('PUT /api/vendor/profile error:', error);
    return res.status(400).json({ error: error.message || 'Bad Request' });
  }
});
