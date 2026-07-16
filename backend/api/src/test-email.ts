import 'dotenv/config';
import { sendEmail, recipientInviteHtml } from './services/email';

async function main() {
  const html = recipientInviteHtml(
    'Acme Corp',
    'Hi {{firstName}},\n\nThank you for your hard work this quarter! Please accept this small token of our appreciation.',
    'Shivam Kishore',
    'http://localhost:3000/r/demotoken'
  );

  const success = await sendEmail({
    to: 'shivamkishore009@gmail.com',
    subject: 'A gift from Acme Corp (Test)',
    html,
  });

  console.log('Email sent:', success);
}

main().catch(console.error);
