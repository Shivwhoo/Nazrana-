import { FulfillmentProvider } from './provider.interface';

export class VendorPortalProvider implements FulfillmentProvider {
  async createOrder(orderId: string): Promise<{ success: boolean; vendorRef?: string }> {
    // For PORTAL fulfillment, the vendor will view the order in their dashboard.
    // We don't need to push it anywhere. Just return success.
    return { success: true, vendorRef: orderId };
  }

  async checkStatus(orderId: string): Promise<{ status: string; trackingUrl?: string }> {
    // The vendor updates the status via the portal, so checking status here is a no-op
    return { status: 'UNKNOWN' };
  }

  async cancel(orderId: string): Promise<boolean> {
    // For PORTAL, cancelling just updates the status in our DB, we don't need external API calls
    return true;
  }
}
