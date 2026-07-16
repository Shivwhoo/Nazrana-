const baseHtml = (content: string) => `
<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Schibsted+Grotesk:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 40px 20px; background-color: #FFFDF7; font-family: 'Schibsted Grotesk', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #FAF6EE; border: 1px solid #E6E0D4; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 30px 30px 30px; border-bottom: 1px dashed rgba(34,28,20,0.2);">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle" style="padding-right: 16px;">
                    <div style="width: 44px; height: 44px; background-color: #221C14; border-radius: 22px; text-align: center;">
                      <span style="font-family: 'Fraunces', Georgia, serif; font-weight: 600; font-size: 26px; color: #FAF6EE; line-height: 44px; display: inline-block;">n</span>
                    </div>
                  </td>
                  <td valign="middle">
                    <div style="font-family: 'Fraunces', Georgia, serif; font-weight: 600; font-size: 34px; color: #221C14; letter-spacing: -0.5px; margin: 0;">nazrana</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 30px; color: #221C14; font-size: 16px; line-height: 1.6;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px; border-top: 1px dashed rgba(34,28,20,0.2);">
              <div style="font-family: 'Schibsted Grotesk', Arial, sans-serif; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #888780;">
                powered by edmentor
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export function inviteEmailHtml(orgName: string, inviterEmail: string, role: string, acceptUrl: string): string {
  return baseHtml(`
    <h2 style="font-family: 'Fraunces', Georgia, serif; font-weight: 500; font-size: 24px; color: #221C14; margin-top: 0; margin-bottom: 16px;">You've been invited!</h2>
    <p style="margin-top: 0; margin-bottom: 16px; color: #4A443A;">You've been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
    <p style="margin-top: 0; margin-bottom: 32px; color: #888780; font-size: 14px;">Invited by: ${inviterEmail}</p>
    
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${acceptUrl}" style="background-color: #B23A1E; color: #FAF6EE; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block; letter-spacing: 0.5px;">
            Accept Invitation
          </a>
        </td>
      </tr>
    </table>
    
    <p style="color: #888780; font-size: 12px; margin-top: 32px; margin-bottom: 0; text-align: center;">
      This link expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
    </p>
  `);
}

export function recipientInviteHtml(orgName: string, messageTemplate: string, recipientName: string, giftUrl: string): string {
  const firstName = recipientName.split(' ')[0];
  const message = messageTemplate.replace('{{firstName}}', firstName);
  
  return baseHtml(`
    <h2 style="font-family: 'Fraunces', Georgia, serif; font-weight: 500; font-size: 26px; color: #221C14; margin-top: 0; margin-bottom: 24px; text-align: center;">A gift from ${orgName}</h2>
    
    <div style="background-color: #FFFDF7; padding: 24px; border-radius: 8px; border: 1px solid #E6E0D4; margin-bottom: 32px;">
      <p style="white-space: pre-wrap; margin: 0; color: #4A443A; font-size: 15px; line-height: 1.7;">${message}</p>
    </div>
    
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${giftUrl}" style="background-color: #B23A1E; color: #FAF6EE; padding: 16px 40px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block; letter-spacing: 0.5px; font-size: 16px;">
            Unwrap Gift
          </a>
        </td>
      </tr>
    </table>
  `);
}

export function recipientReminderHtml(orgName: string, giftUrl: string): string {
  return baseHtml(`
    <h2 style="font-family: 'Fraunces', Georgia, serif; font-weight: 500; font-size: 24px; color: #221C14; margin-top: 0; margin-bottom: 16px; text-align: center;">Your gift is waiting!</h2>
    <p style="margin-top: 0; margin-bottom: 32px; color: #4A443A; text-align: center;">Don't forget to claim your gift from <strong>${orgName}</strong> before it expires.</p>
    
    <table width="100%" border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${giftUrl}" style="background-color: #B23A1E; color: #FAF6EE; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block; letter-spacing: 0.5px;">
            Claim Gift Now
          </a>
        </td>
      </tr>
    </table>
  `);
}

export function redemptionConfirmationHtml(variantTitle: string): string {
  return baseHtml(`
    <h2 style="font-family: 'Fraunces', Georgia, serif; font-weight: 500; font-size: 24px; color: #221C14; margin-top: 0; margin-bottom: 16px;">Gift Claimed!</h2>
    <p style="margin-top: 0; margin-bottom: 16px; color: #4A443A;">We've received your details. Your <strong>${variantTitle}</strong> will be processed shortly.</p>
    <p style="margin-top: 0; margin-bottom: 0; color: #888780; font-size: 14px;">You can use your original gift link to track the status of your order.</p>
  `);
}

export function shippedEmailHtml(variantTitle: string, trackingNumber?: string, trackingUrl?: string): string {
  let trackingHtml = '';
  if (trackingNumber) {
    trackingHtml = `<div style="margin-top: 24px; padding: 16px; background-color: #FFFDF7; border: 1px solid #E6E0D4; border-radius: 6px;">
      <p style="margin: 0; color: #888780; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Tracking Number</p>
      <p style="margin: 4px 0 0 0; font-family: monospace; font-size: 16px; color: #221C14;"><strong>${trackingNumber}</strong></p>`;
      
    if (trackingUrl) {
      trackingHtml += `<div style="margin-top: 16px;"><a href="${trackingUrl}" style="color: #B23A1E; text-decoration: none; font-weight: 500;">Track Package &rarr;</a></div>`;
    }
    trackingHtml += `</div>`;
  }

  return baseHtml(`
    <h2 style="font-family: 'Fraunces', Georgia, serif; font-weight: 500; font-size: 24px; color: #221C14; margin-top: 0; margin-bottom: 16px;">Your gift is on the way!</h2>
    <p style="margin-top: 0; margin-bottom: 0; color: #4A443A;">Your <strong>${variantTitle}</strong> has been shipped and is heading your way.</p>
    ${trackingHtml}
  `);
}
