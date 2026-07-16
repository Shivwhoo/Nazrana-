import { Router } from 'express';
import { WalletService } from '../services/wallet.service';
import { prisma } from '../prisma';

export const webhooksRouter = Router();

webhooksRouter.post('/razorpay', async (req: any, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    
    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify signature
    await WalletService.verifyRazorpayWebhook(req.body, signature);

    const event = req.body.event;
    
    if (event === 'payment.captured') {
      const eventId = req.headers['x-razorpay-event-id'] || `event_${Date.now()}`;
      await WalletService.processRazorpayPayment(eventId as string, req.body.payload.payment);
    }

    res.json({ status: 'ok' });
  } catch (err: any) {
    console.error('Webhook error:', err);
    // Always return 200 to prevent retries on invalid signature unless it's a transient DB error
    if (err.message === 'Invalid signature') {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

webhooksRouter.post('/email-bounce', async (req: any, res) => {
  try {
    const { email, type } = req.body;
    
    if (!email || type !== 'Bounce') {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Find all active recipients with this email
    const recipients = await prisma.recipient.findMany({
      where: {
        email,
        status: { in: ['INVITED', 'VIEWED'] }
      }
    });

    for (const rec of recipients) {
      await prisma.recipient.update({
        where: { id: rec.id },
        data: { status: 'BOUNCED' }
      });
      
      await prisma.notificationLog.create({
        data: {
          recipientType: 'RECIPIENT',
          recipientId: rec.id,
          channel: 'EMAIL',
          template: 'BOUNCE_WEBHOOK',
          status: 'BOUNCED'
        }
      });
    }

    res.json({ status: 'ok', updated: recipients.length });
  } catch (err: any) {
    console.error('Bounce webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

