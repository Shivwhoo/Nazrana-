import { FulfillmentProvider } from './provider.interface';
import { prisma } from '../../prisma';

export class DigitalProvider implements FulfillmentProvider {
  async createOrder(orderId: string): Promise<{ success: boolean; vendorRef?: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) throw new Error('Order not found');

    // Generate a dummy random 8-character code for digital vouchers
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    return { 
      success: true, 
      vendorRef: `DIGITAL_${randomCode}` 
    };
  }

  async cancel(orderId: string): Promise<boolean> {
    // Digital orders are delivered instantly, usually cannot be cancelled
    return false; 
  }
}
