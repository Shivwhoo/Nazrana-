import { Router } from 'express';
import { prisma } from '../../prisma';
import { FulfillmentService } from '../../services/fulfillment.service';

export const vendorOrdersRouter = Router();

// GET /api/vendor/orders
vendorOrdersRouter.get('/', async (req, res) => {
  try {
    const vendorId = (req as any).vendorId;
    const orders = await prisma.order.findMany({
      where: {
        variant: { product: { vendorId } },
        // Vendor shouldn't see PENDING or CONFIRMED until SENT_TO_VENDOR
        status: { in: ['SENT_TO_VENDOR', 'SHIPPED', 'DELIVERED', 'EXCEPTION', 'CANCELLED'] }
      },
      include: {
        recipient: true,
        variant: { include: { product: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(orders);
  } catch (error) {
    console.error('GET /api/vendor/orders error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/vendor/orders/:orderId/ship
vendorOrdersRouter.post('/:orderId/ship', async (req, res) => {
  try {
    const vendorId = (req as any).vendorId;
    const vendorUserId = (req as any).vendorUserId;
    const { orderId } = req.params;
    const { trackingNumber, courierName } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { variant: { include: { product: true } } }
    });

    if (!order || order.variant.product.vendorId !== vendorId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status !== 'SENT_TO_VENDOR') {
      return res.status(400).json({ error: 'Order must be in SENT_TO_VENDOR status to ship' });
    }

    // Advance to SHIPPED
    await FulfillmentService.advanceStatus(orderId, 'SHIPPED', vendorUserId, `Tracking: ${trackingNumber} via ${courierName}`);

    // Create Shipment record
    await prisma.shipment.create({
      data: {
        orderId,
        carrier: courierName,
        trackingNumber: trackingNumber
      }
    });
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/vendor/orders/:orderId/ship error:', error);
    return res.status(400).json({ error: error.message || 'Bad Request' });
  }
});

// POST /api/vendor/orders/:orderId/exception
vendorOrdersRouter.post('/:orderId/exception', async (req, res) => {
  try {
    const vendorId = (req as any).vendorId;
    const vendorUserId = (req as any).vendorUserId;
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { variant: { include: { product: true } } }
    });

    if (!order || order.variant.product.vendorId !== vendorId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await FulfillmentService.advanceStatus(orderId, 'EXCEPTION', vendorUserId, `Vendor reported exception: ${reason}`);

    await prisma.order.update({
      where: { id: orderId },
      data: { exceptionNote: reason }
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/vendor/orders/:orderId/exception error:', error);
    return res.status(400).json({ error: error.message || 'Bad Request' });
  }
});
