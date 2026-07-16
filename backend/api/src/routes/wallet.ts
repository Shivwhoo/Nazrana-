import { Router } from 'express';
import { requireRole } from '../middleware/rbac';
import { authMiddleware } from '../middleware/auth';
import { WalletService } from '../services/wallet.service';
import { CreateRazorpayOrderSchema } from '@gifting/shared';
import { prisma } from '../prisma';
import { logError } from '../utils/logger';

export const walletRouter = Router({ mergeParams: true });

walletRouter.use(authMiddleware);
// walletRouter is mounted under /api/orgs/:orgId/wallet

walletRouter.get('/', requireRole(['OWNER', 'ADMIN', 'FINANCE']), async (req: any, res) => {
  try {
    const wallet = await WalletService.getWallet(req.params.orgId);
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }
    
    // Convert BigInt to string for JSON serialization
    const serializedWallet = JSON.parse(JSON.stringify(wallet, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    res.json({ wallet: serializedWallet });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

walletRouter.post('/razorpay/create-order', requireRole(['OWNER', 'ADMIN', 'FINANCE']), async (req: any, res) => {
  try {
    const data = CreateRazorpayOrderSchema.parse(req.body);
    const order = await WalletService.createRazorpayOrder(req.params.orgId, data.amountCents);
    res.json(order);
  } catch (err: any) {
    console.error('Error creating razorpay order:', err);
    res.status(400).json({ error: err.message });
  }
});

walletRouter.post('/razorpay/verify', requireRole(['OWNER', 'ADMIN', 'FINANCE']), async (req: any, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const result = await WalletService.verifyAndProcessRazorpayPayment(
      req.params.orgId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    );
    res.json(result);
  } catch (err: any) {
    console.error('Verify error:', err);
    res.status(400).json({ error: err.message });
  }
});

walletRouter.post('/bank-transfer/proforma', requireRole(['OWNER', 'ADMIN', 'FINANCE']), async (req: any, res) => {
  try {
    const data = CreateRazorpayOrderSchema.parse(req.body); // reuse schema for amount
    const pdfBuffer = await WalletService.generateProformaPDF(req.params.orgId, data.amountCents);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=proforma-${req.params.orgId}.pdf`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Export Wallet Ledger CSV
walletRouter.get('/export', requireRole(['OWNER', 'ADMIN', 'FINANCE']), async (req: any, res) => {
  try {
    const orgId = req.params.orgId;
    
    const wallet = await prisma.wallet.findUnique({
      where: { organizationId: orgId },
      include: {
        ledger: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    const headers = ['Date', 'Type', 'Amount (Cents)', 'Balance After (Cents)', 'Held After (Cents)', 'Reference Type', 'Reference ID'];
    const rows = wallet.ledger.map(l => {
      return [
        l.createdAt.toISOString(),
        l.type,
        l.amountCents.toString(),
        l.balanceAfterCents.toString(),
        l.heldAfterCents.toString(),
        l.referenceType,
        l.referenceId || ''
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=wallet-ledger-export.csv`);
    return res.send(csvContent);
  } catch (error) {
    logError('GET /wallet/export', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
