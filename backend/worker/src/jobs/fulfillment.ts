import { Job } from 'bullmq';
import { FulfillmentService } from '../../../api/src/services/fulfillment.service';

export default async function processFulfillment(job: Job) {
  const { orderId } = job.data;
  
  if (!orderId) {
    throw new Error('Fulfillment job missing orderId in data');
  }

  console.log(`[FULFILLMENT] Processing order ${orderId} (attempt ${job.attemptsMade + 1})`);
  
  await FulfillmentService.processOrder(orderId);
}
