import nodemailer from 'nodemailer';
import { EmailProvider, SendEmailOptions } from './provider.interface';

export class DevEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter | null = null;

  private async getTransporter() {
    if (!this.transporter) {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }
    return this.transporter;
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    try {
      const tp = await this.getTransporter();
      const info = await tp.sendMail({
        from: '"Dev Gifting" <no-reply@gifting.internal>',
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
      
      console.log('\n================== DEV EMAIL SENT ==================');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      console.log('====================================================\n');
      
      return true;
    } catch (error) {
      console.error('Failed to send dev email via ethereal:', error);
      return false;
    }
  }
}
