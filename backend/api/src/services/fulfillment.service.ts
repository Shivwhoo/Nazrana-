import { prisma } from '../prisma';
import { getFulfillmentProvider } from './fulfillment';
import { Queue } from 'bullmq';
import { createRedisClient, QUEUES } from '@gifting/shared/src/redis';

const fulfillmentQueue = new Queue(QUEUES.FULFILLMENT, { connection: createRedisClient() as any });

export class FulfillmentService {
  
  /**
   * Enqueues an order for background fulfillment processing.
   */
  static async enqueueFulfillment(orderId: string) {
    await fulfillmentQueue.add('process-fulfillment', { orderId }, {
      jobId: `fulfillment_${orderId}`, // Deduplication
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  /**
   * Processes a PENDING order, advances its state, and dispatches to the correct vendor.
   * Typically called by the BullMQ worker.
   */
  static async processOrder(orderId: string) {
    // 1. Fetch order and validate state
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        variant: {
          include: { product: { include: { vendor: true } } }
        }
      }
    });

    if (!order) throw new Error(`Order ${orderId} not found`);

    if (order.status !== 'PENDING') {
      console.log(`Order ${orderId} is not PENDING (current status: ${order.status}). Skipping fulfillment.`);
      return; // Already processed
    }

    const vendor = order.variant.product.vendor;

    // 2. Transition state to CONFIRMED
    await this.advanceStatus(order.id, 'CONFIRMED', 'SYSTEM', 'Fulfillment process started');

    try {
      // 3. Dispatch to provider
      const provider = getFulfillmentProvider(vendor.fulfillmentType as 'EMAIL' | 'API' | 'DIGITAL' | 'PORTAL');
      const result = await provider.createOrder(order.id);

      if (result.success) {
        // 4. If success, advance state based on type
        const nextStatus = vendor.fulfillmentType === 'DIGITAL' ? 'DELIVERED' : 'SENT_TO_VENDOR';
        
        await prisma.order.update({
          where: { id: order.id },
          data: { vendorOrderRef: result.vendorRef }
        });

        await this.advanceStatus(order.id, nextStatus as any, 'SYSTEM', `Dispatched to vendor successfully`);
      } else {
        throw new Error('Provider returned success=false');
      }

    } catch (error: any) {
      console.error(`[FulfillmentService] Failed to process order ${orderId}: ${error.message}`);
      throw error; // Let BullMQ retry
    }
  }

  /**
   * Handles terminal failures from the worker (e.g. after max retries).
   */
  static async handleTerminalFailure(orderId: string, errorMsg: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status === 'EXCEPTION' || order.status === 'DELIVERED') return;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'EXCEPTION',
        exceptionNote: `Fulfillment failed: ${errorMsg}`
      }
    });

    await prisma.auditLog.create({
      data: {
        organizationId: order.organizationId,
        actorId: 'SYSTEM',
        action: 'ORDER_STATUS_CHANGED',
        targetType: 'ORDER',
        targetId: order.id,
        metadata: { from: order.status, to: 'EXCEPTION', note: `Fulfillment failed: ${errorMsg}` }
      }
    });
  }

  /**
   * Safe state machine advancement.
   */
  static async advanceStatus(orderId: string, nextStatus: 'CONFIRMED' | 'SENT_TO_VENDOR' | 'SHIPPED' | 'DELIVERED' | 'EXCEPTION' | 'CANCELLED', actorId: string, note?: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    const validTransitions: Record<string, string[]> = {
      'PENDING': ['CONFIRMED', 'EXCEPTION', 'CANCELLED'],
      'CONFIRMED': ['SENT_TO_VENDOR', 'DELIVERED', 'EXCEPTION', 'CANCELLED'],
      'SENT_TO_VENDOR': ['SHIPPED', 'DELIVERED', 'EXCEPTION', 'CANCELLED'],
      'SHIPPED': ['DELIVERED', 'EXCEPTION'],
      'EXCEPTION': ['PENDING', 'CONFIRMED', 'CANCELLED'],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Invalid order transition from ${order.status} to ${nextStatus}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: nextStatus }
      });

      await tx.auditLog.create({
        data: {
          organizationId: order.organizationId,
          actorId,
          action: 'ORDER_STATUS_CHANGED',
          targetType: 'ORDER',
          targetId: orderId,
          metadata: { from: order.status, to: nextStatus, note }
        }
      });
    });
  }
}
