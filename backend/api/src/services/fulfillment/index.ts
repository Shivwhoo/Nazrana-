import { FulfillmentProvider } from './provider.interface';
import { EmailVendorProvider } from './email.provider';
import { DigitalProvider } from './digital.provider';

export function getFulfillmentProvider(type: 'EMAIL' | 'API' | 'DIGITAL'): FulfillmentProvider {
  switch (type) {
    case 'EMAIL':
      return new EmailVendorProvider();
    case 'DIGITAL':
      return new DigitalProvider();
    case 'API':
      // Fallback or not implemented for this MVP, use email as fallback
      console.warn('API provider not implemented, falling back to Email provider');
      return new EmailVendorProvider();
    default:
      throw new Error(`Unknown fulfillment provider type: ${type}`);
  }
}
