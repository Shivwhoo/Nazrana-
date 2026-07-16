const baseHtml = (content: string) => `
<div style="font-family: 'Fraunces', Arial, serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px; background-color: #FAF6EE; color: #221C14;">
  ${content}
</div>
`;

export function inviteEmailHtml(orgName: string, inviterEmail: string, role: string, acceptUrl: string): string {
  return baseHtml(`
    <h2 style="color: #B23A1E; margin-bottom: 8px;">You've been invited!</h2>
    <p>You've been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
    <p style="color: #555;">Invited by: ${inviterEmail}</p>
    <p style="margin-top: 24px;">
      <a href="${acceptUrl}"
         style="background: #B23A1E; color: #fff; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; display: inline-block;">
        Accept Invitation
      </a>
    </p>
    <p style="color: #888; font-size: 12px; margin-top: 24px; font-family: sans-serif;">
      This link expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  `);
}

export function recipientInviteHtml(orgName: string, messageTemplate: string, recipientName: string, giftUrl: string): string {
  const firstName = recipientName.split(' ')[0];
  const message = messageTemplate.replace('{{firstName}}', firstName);
  
  return baseHtml(`
    <h2 style="color: #B23A1E; margin-bottom: 16px;">A gift from ${orgName}</h2>
    <div style="background: #fff; padding: 16px; border-radius: 6px; border: 1px solid #e5e5e5; margin-bottom: 24px;">
      <p style="white-space: pre-wrap;">${message}</p>
    </div>
    <p style="text-align: center;">
      <a href="${giftUrl}"
         style="background: #B23A1E; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
        Unwrap Gift
      </a>
    </p>
  `);
}

export function recipientReminderHtml(orgName: string, giftUrl: string): string {
  return baseHtml(`
    <h2 style="color: #B23A1E; margin-bottom: 16px;">Reminder: Your gift from ${orgName} is waiting!</h2>
    <p>Don't forget to claim your gift from ${orgName} before it expires.</p>
    <p style="text-align: center; margin-top: 24px;">
      <a href="${giftUrl}"
         style="background: #B23A1E; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
        Claim Gift Now
      </a>
    </p>
  `);
}

export function redemptionConfirmationHtml(variantTitle: string): string {
  return baseHtml(`
    <h2 style="color: #2E7D52; margin-bottom: 16px;">Gift Claimed!</h2>
    <p>We've received your details. Your <strong>${variantTitle}</strong> will be processed shortly.</p>
    <p>You can use your original gift link to track the status of your order.</p>
  `);
}

export function shippedEmailHtml(variantTitle: string, trackingNumber?: string, trackingUrl?: string): string {
  let trackingHtml = '';
  if (trackingNumber) {
    trackingHtml = `<p>Tracking Number: <strong>${trackingNumber}</strong></p>`;
    if (trackingUrl) {
      trackingHtml += `<p><a href="${trackingUrl}" style="color: #B23A1E;">Track Package</a></p>`;
    }
  }

  return baseHtml(`
    <h2 style="color: #2E7D52; margin-bottom: 16px;">Your gift is on the way!</h2>
    <p>Your <strong>${variantTitle}</strong> has been shipped.</p>
    ${trackingHtml}
  `);
}
