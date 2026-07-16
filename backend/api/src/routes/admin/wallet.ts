import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { requirePlatformAdmin } from '../../middleware/rbac';
import { WalletService } from '../../services/wallet.service';
import { z } from 'zod';

export const adminWalletRouter = Router();

adminWalletRouter.use(authMiddleware);
adminWalletRouter.use(requirePlatformAdmin);

const ManualCreditSchema = z.object({
  amountCents: z.number().int().positive(),
  reference: z.string().min(1),
  organizationId: z.string().uuid(),
});

adminWalletRouter.post('/manual-credit', async (req: any, res) => {
  try {
    const data = ManualCreditSchema.parse(req.body);
    const result = await WalletService.manualCredit(
      data.organizationId,
      data.amountCents,
      data.reference,
      req.user.id
    );
    
    // Convert BigInt for JSON
    const serialized = JSON.parse(JSON.stringify(result, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    res.json(serialized);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
