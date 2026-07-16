import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function (job: Job) {
  console.log(`[ledger-integrity] Starting nightly ledger integrity check`);
  
  const wallets = await prisma.wallet.findMany();
  let driftCount = 0;

  for (const wallet of wallets) {
    const ledgers = await prisma.walletLedger.findMany({
      where: { walletId: wallet.id },
    });

    let computedBalance = 0n;
    let computedHeld = 0n;

    for (const entry of ledgers) {
      if (entry.type === 'HOLD') {
        computedHeld += entry.amountCents;
      } else if (entry.type === 'HOLD_RELEASE') {
        computedHeld -= entry.amountCents; // Assuming HOLD_RELEASE amount is positive
      } else if (entry.type === 'TOPUP') {
        computedBalance += entry.amountCents;
      } else if (entry.type === 'CHARGE') {
        computedBalance -= entry.amountCents;
      } else if (entry.type === 'REFUND') {
        computedBalance += entry.amountCents;
      } else if (entry.type === 'ADJUSTMENT') {
        computedBalance += entry.amountCents; // Signed amount
      }
    }

    if (computedBalance !== wallet.balanceCents || computedHeld !== wallet.heldCents) {
      driftCount++;
      console.error(
        `[ledger-integrity] DRIFT DETECTED for wallet ${wallet.id} (Org: ${wallet.organizationId}). ` +
        `Expected Balance: ${computedBalance}, Actual Balance: ${wallet.balanceCents}. ` +
        `Expected Held: ${computedHeld}, Actual Held: ${wallet.heldCents}.`
      );
    }
  }

  if (driftCount === 0) {
    console.log(`[ledger-integrity] Integrity check passed for ${wallets.length} wallets. No drift detected.`);
  } else {
    console.warn(`[ledger-integrity] Found drift in ${driftCount} out of ${wallets.length} wallets.`);
    // Here we would potentially alert via email/slack.
  }
}
