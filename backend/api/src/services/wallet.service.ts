import { prisma } from '../prisma';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';

// We will instantiate Razorpay inside the methods to ensure env vars are loaded

export class WalletService {
  static async getWallet(orgId: string) {
    return await prisma.wallet.findUnique({
      where: { organizationId: orgId },
      include: {
        ledger: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  static async createRazorpayOrder(orgId: string, amountCents: number) {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });

    const amountInPaise = amountCents; // Razorpay expects paise (same as cents for INR)

    const shortOrgId = orgId.substring(0, 8);
    const shortTime = Date.now().toString().slice(-8);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${shortOrgId}_${shortTime}`,
    });

    const payment = await prisma.payment.create({
      data: {
        organizationId: orgId,
        provider: 'RAZORPAY',
        providerRef: order.id,
        amountCents: BigInt(amountCents),
        status: 'PENDING',
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment.id,
    };
  }

  static async verifyRazorpayWebhook(body: any, signature: string) {
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const bodyStr = JSON.stringify(body);
    
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyStr)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid signature');
    }
    return true;
  }

  static async verifyAndProcessRazorpayPayment(orgId: string, paymentId: string, orderId: string, signature: string) {
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(orderId + "|" + paymentId)
      .digest('hex');

    if (generatedSignature !== signature) {
      throw new Error('Invalid signature');
    }

    return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { providerRef: orderId },
      });

      if (!payment) throw new Error('Payment not found');
      if (payment.status === 'SUCCESS') {
        return { alreadyProcessed: true };
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS' },
      });

      const wallet = await tx.wallet.findUnique({
        where: { organizationId: orgId },
      });

      if (!wallet) throw new Error('Wallet not found');

      const amountCents = payment.amountCents;
      const newBalance = wallet.balanceCents + amountCents;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: newBalance },
      });

      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          amountCents: amountCents,
          type: 'TOPUP',
          referenceType: 'PAYMENT',
          referenceId: payment.id,
          balanceAfterCents: newBalance,
          heldAfterCents: wallet.heldCents,
        },
      });

      return { success: true, newBalance: newBalance.toString() };
    });
  }

  static async processRazorpayPayment(eventId: string, paymentData: any) {
    const { order_id, amount, status } = paymentData.entity;
    
    if (status !== 'captured') {
      return null;
    }

    return await prisma.$transaction(async (tx) => {
      // Idempotency check
      const existingEvent = await tx.webhookEvent.findUnique({
        where: { eventId },
      });

      if (existingEvent) {
        return null; // Already processed
      }

      await tx.webhookEvent.create({
        data: {
          provider: 'RAZORPAY',
          eventId,
        },
      });

      const payment = await tx.payment.findFirst({
        where: { providerRef: order_id },
      });

      if (!payment || payment.status !== 'PENDING') {
        throw new Error('Payment not found or already processed');
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS' },
      });

      const wallet = await tx.wallet.findUnique({
        where: { organizationId: payment.organizationId },
      });

      if (!wallet) throw new Error('Wallet not found');

      const amountCents = payment.amountCents;
      const newBalance = wallet.balanceCents + amountCents;

      // Update wallet balance and create ledger entry in single transaction
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: newBalance },
      });

      await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          amountCents: amountCents,
          type: 'TOPUP',
          referenceType: 'PAYMENT',
          referenceId: payment.id,
          balanceAfterCents: newBalance,
          heldAfterCents: wallet.heldCents,
        },
      });

      return { walletId: wallet.id, newBalance };
    });
  }

  static async manualCredit(orgId: string, amountCents: number, reference: string, adminId: string) {
    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { organizationId: orgId },
      });

      if (!wallet) throw new Error('Wallet not found');

      const newBalance = wallet.balanceCents + BigInt(amountCents);

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceCents: newBalance },
      });

      const ledgerEntry = await tx.walletLedger.create({
        data: {
          walletId: wallet.id,
          amountCents: BigInt(amountCents),
          type: 'TOPUP',
          referenceType: 'ADMIN_CREDIT',
          referenceId: reference,
          balanceAfterCents: newBalance,
          heldAfterCents: wallet.heldCents,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: orgId,
          actorId: adminId,
          action: 'MANUAL_CREDIT',
          targetType: 'WALLET',
          targetId: wallet.id,
          metadata: { amountCents, reference },
        },
      });

      return { wallet, ledgerEntry };
    });
  }

  static async generateProformaPDF(orgId: string, amountCents: number): Promise<Buffer> {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new Error('Organization not found');

    const proformaNumber = `PI-${orgId.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    
    await prisma.proformaInvoice.create({
      data: {
        number: proformaNumber,
        organizationId: orgId,
        totals: { amountCents },
      }
    });

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Simple Proforma Invoice Template
      doc.fontSize(20).text('PROFORMA INVOICE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Invoice No: ${proformaNumber}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown();
      doc.text(`Bill To: ${org.name}`);
      doc.text(`GSTIN: ${org.gstin}`);
      doc.moveDown(2);
      
      const amountINR = (amountCents / 100).toFixed(2);
      doc.text('Description: Wallet Topup', { continued: true }).text(`Amount: ₹${amountINR}`, { align: 'right' });
      
      doc.moveDown(4);
      doc.text('Bank Details for Transfer:');
      doc.text('Bank: Test Bank Ltd');
      doc.text('Account Name: Corporate Gifting Platform');
      doc.text('Account No: 1234567890');
      doc.text('IFSC: TEST0001234');
      
      doc.end();
    });
  }
}
