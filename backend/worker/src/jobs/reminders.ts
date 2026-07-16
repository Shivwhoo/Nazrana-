import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { sendEmailWithLog, recipientReminderHtml } from '../services/email';

const prisma = new PrismaClient();

export default async function processReminders(job: Job) {
  console.log(`[REMINDERS] Starting daily reminders job`);
  let processedCount = 0;

  try {
    // We want recipients that are INVITED or VIEWED
    // AND reminderCount < 3
    // AND updatedAt is older than 4 days.
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const recipientsToRemind = await prisma.recipient.findMany({
      where: {
        status: {
          in: ['INVITED', 'VIEWED'],
        },
        reminderCount: {
          lt: 3,
        },
        updatedAt: {
          lte: fourDaysAgo,
        },
      },
      include: {
        campaign: {
          include: {
            organization: true,
          }
        }
      }
    });

    console.log(`[REMINDERS] Found ${recipientsToRemind.length} recipients to remind`);

    for (const recipient of recipientsToRemind) {
      // In production this is the real URL.
      const rawToken = 'pending'; // We don't have the original raw token since it's hashed!
      // Wait, we can't reconstruct the URL because we only have the tokenHash!
      // To send a reminder with the link, we must have the raw token, or the link is lost.
      // Ah! If we only have tokenHash in the DB, how do we send the link again?
      // In F1, it says: "token: 128-bit random, stored hashed (SHA-256)".
      // But if it's hashed, the system cannot recover the raw token to send a reminder.
      // Either we store the raw token in encrypted form, or the reminder doesn't contain the token and asks them to check their original email.
      // However, usually, a platform like this stores a token in the DB that isn't irreversibly hashed if they need to send it again, OR they store it encrypted.
      // Let's modify the Fan-out worker to store an encrypted version of the token so we can send it in reminders, OR we just generate a new token and invalidate the old one. Generating a new token is easier.
      // Let's re-generate the token for the reminder.
      
      const crypto = require('crypto');
      const newRawToken = crypto.randomBytes(16).toString('hex');
      const newTokenHash = crypto.createHash('sha256').update(newRawToken).digest('hex');
      const giftUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/r/${newRawToken}`;

      const html = recipientReminderHtml(
        recipient.campaign.organization.name,
        giftUrl
      );

      // Send the email
      const success = await sendEmailWithLog(
        {
          to: recipient.email,
          subject: `Reminder: Your gift from ${recipient.campaign.organization.name} is waiting!`,
          html,
        },
        'RECIPIENT',
        recipient.id,
        'REMINDER'
      );

      if (success) {
        // Update recipient with new token hash and increment reminder count
        await prisma.recipient.update({
          where: { id: recipient.id },
          data: {
            tokenHash: newTokenHash,
            reminderCount: { increment: 1 },
          }
        });
        processedCount++;
      }
    }

    console.log(`[REMINDERS] Finished job. Successfully sent ${processedCount} reminders.`);
  } catch (err: any) {
    console.error(`[REMINDERS] Job failed: ${err.message}`);
    throw err;
  }
}
