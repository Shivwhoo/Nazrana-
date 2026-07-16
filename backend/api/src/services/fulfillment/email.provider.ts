import { FulfillmentProvider } from './provider.interface';
import { prisma } from '../../prisma';
import { sendEmailWithLog } from '../email';

export class EmailVendorProvider implements FulfillmentProvider {
  async createOrder(orderId: string): Promise<{ success: boolean; vendorRef?: string }> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        recipient: true,
        variant: {
          include: { product: { include: { vendor: true } } }
        },
        organization: true,
        campaign: true,
      }
    });

    if (!order) throw new Error('Order not found');
    
    const vendor = order.variant.product.vendor;
    if (!vendor.contact) throw new Error('Vendor does not have a contact email');

    // Create a simple PO HTML template
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Purchase Order</h2>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Organization:</strong> ${order.organization.name}</p>
        <p><strong>Campaign:</strong> ${order.campaign.name}</p>
        <hr />
        <h3>Product Details</h3>
        <p><strong>Product:</strong> ${order.variant.product.title}</p>
        <p><strong>Variant/SKU:</strong> ${order.variant.title} (${order.variant.sku})</p>
        <hr />
        <h3>Shipping Details</h3>
        <p><strong>Recipient Name:</strong> ${order.recipient.name}</p>
        <p><strong>Contact:</strong> ${order.recipient.phone || order.recipient.email}</p>
        <p><strong>Address:</strong><br/>
          ${order.recipient.address?.replace(/\n/g, '<br/>') || 'Not Provided'}
        </p>
        <hr />
        <p>Please process this order and provide the tracking details once shipped.</p>
      </div>
    `;

    // Send the PO email
    const emailSent = await sendEmailWithLog({
      to: vendor.contact,
      subject: `New Purchase Order - ${order.id}`,
      html
    }, order.organizationId, order.campaignId, order.recipientId);

    if (!emailSent) {
      throw new Error('Failed to send PO email to vendor');
    }

    return { success: true };
  }

  async cancel(orderId: string): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { variant: { include: { product: { include: { vendor: true } } } } }
    });

    if (!order) return false;
    
    const vendor = order.variant.product.vendor;
    if (!vendor.contact) return false;

    const html = `<p>Please cancel Order ID: ${order.id}</p>`;
    
    await sendEmailWithLog({
      to: vendor.contact,
      subject: `CANCEL ORDER - ${order.id}`,
      html
    }, order.organizationId, order.campaignId, order.recipientId);

    return true;
  }
}
