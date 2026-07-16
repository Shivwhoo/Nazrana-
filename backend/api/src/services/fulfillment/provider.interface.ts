export interface FulfillmentProvider {
  /**
   * Dispatches the order to the vendor (e.g. via email or API)
   * Should throw an error if dispatch fails, which will trigger a retry in the worker.
   */
  createOrder(orderId: string): Promise<{ success: boolean; vendorRef?: string }>;
  
  /**
   * Attempts to cancel the order with the vendor
   */
  cancel(orderId: string): Promise<boolean>;
}
