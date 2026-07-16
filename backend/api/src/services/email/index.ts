import { SmtpEmailProvider } from './smtp.provider';
import { SendEmailOptions } from './provider.interface';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Use SMTP provider
const provider = new SmtpEmailProvider();

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  return provider.sendEmail(options);
}

export async function sendEmailWithLog(
  options: SendEmailOptions, 
  recipientType: string, 
  recipientId: string, 
  templateName: string
): Promise<boolean> {
  const success = await provider.sendEmail(options);

  try {
    await prisma.notificationLog.create({
      data: {
        recipientType,
        recipientId,
        channel: 'EMAIL',
        template: templateName,
        status: success ? 'SENT' : 'FAILED',
      },
    });
  } catch (err) {
    console.error('[EMAIL LOG] Failed to write to NotificationLog', err);
  }

  return success;
}

export * from './templates';
