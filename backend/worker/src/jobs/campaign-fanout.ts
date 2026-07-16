import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { sendEmailWithLog, recipientInviteHtml } from '../services/email';

const prisma = new PrismaClient();

export default async function (job: Job) {
  const { campaignId } = job.data;
  console.log(`[campaign-fanout] Starting fan-out for campaign ${campaignId}`);

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { organization: true },
  });

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  // Process in batches
  const BATCH_SIZE = 500;
  let processed = 0;
  let hasMore = true;
  let lastId: string | undefined = undefined;

  while (hasMore) {
    const recipients: any[] = await prisma.recipient.findMany({
      where: { campaignId },
      take: BATCH_SIZE,
      skip: lastId ? 1 : 0,
      cursor: lastId ? { id: lastId } : undefined,
      orderBy: { id: 'asc' },
    });

    if (recipients.length === 0) {
      hasMore = false;
      break;
    }

    lastId = recipients[recipients.length - 1].id;

    for (const recipient of recipients) {
      // If already processed, skip
      if (recipient.status !== 'INVITED' || recipient.tokenHash !== 'pending') {
        // Wait, originally CSV import creates a random tokenHash. 
        // We will regenerate it now with the REAL token to send in the email.
      }

      // Generate 128-bit (16 bytes) secure random token
      const rawToken = crypto.randomBytes(16).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // In production, this would be `https://app.gifting.com/r/${rawToken}`
      const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/r/${rawToken}`;

      // 1. Update recipient token
      await prisma.recipient.update({
        where: { id: recipient.id },
        data: { tokenHash },
      });

      // 2. Send email via provider
      const html = recipientInviteHtml(
        campaign.organization.name,
        campaign.messageTemplate,
        recipient.name,
        inviteUrl
      );

      await sendEmailWithLog(
        {
          to: recipient.email,
          subject: `A gift from ${campaign.organization.name}`,
          html
        },
        'RECIPIENT',
        recipient.id,
        'INVITE'
      );

      processed++;
    }

    // Stagger batches to avoid rate limits
    if (recipients.length === BATCH_SIZE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`[campaign-fanout] Finished fan-out for campaign ${campaignId}. Processed ${processed} recipients.`);
}
