import { Resend } from 'resend';
import { EmailProvider, SendEmailOptions } from './provider.interface';

export class ResendEmailProvider implements EmailProvider {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: '"Gifting Platform" <onboarding@resend.dev>',
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        console.error('[RESEND EMAIL] ✗ Failed to send via Resend:', error);
        return false;
      }

      console.log(`[RESEND EMAIL] ✓ Sent successfully. ID: ${data?.id}`);
      return true;
    } catch (err: any) {
      console.error(`[RESEND EMAIL] ✗ Unexpected error: ${err.message}`);
      return false;
    }
  }
}
