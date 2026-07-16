import nodemailer from 'nodemailer';
import { EmailProvider, SendEmailOptions } from './provider.interface';

export class SmtpEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER || process.env.SMTP_USER,
          pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      const tp = this.getTransporter();
      await tp.sendMail({
        from: `"Gifting Platform" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      // Masking email for console log just to be safe
      const maskedEmail = options.to.replace(/(.{2})(.*)(@.*)/, '$1***$3');
      console.log(`[EMAIL] ✓ Sent to ${maskedEmail} — "${options.subject}"`);
      return true;
    } catch (err: any) {
      const maskedEmail = options.to.replace(/(.{2})(.*)(@.*)/, '$1***$3');
      console.error(`[EMAIL] ✗ Failed to send to ${maskedEmail} — ${err.message}`);
      return false;
    }
  }
}
