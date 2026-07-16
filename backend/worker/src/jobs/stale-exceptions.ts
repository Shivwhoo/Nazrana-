import { prisma } from '../../../api/src/prisma';
import { sendEmailWithLog } from '../../../api/src/services/email';

export default async function processStaleExceptions() {
  console.log('[STALE-EXCEPTIONS] Checking for stale exception orders...');

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const staleOrders = await prisma.order.findMany({
    where: {
      status: 'EXCEPTION',
      updatedAt: { lt: twentyFourHoursAgo }
    },
    include: {
      organization: true,
      variant: { include: { product: true } }
    }
  });

  if (staleOrders.length === 0) {
    console.log('[STALE-EXCEPTIONS] No stale exception orders found.');
    return;
  }

  console.log(`[STALE-EXCEPTIONS] Found ${staleOrders.length} stale exception orders. Sending alert.`);

  const adminEmail = process.env.ADMIN_EMAIL || 'ops@corporategifting.com';

  const orderListHtml = staleOrders.map(o => `
    <li>
      <strong>Order ID:</strong> ${o.id} <br/>
      <strong>Org:</strong> ${o.organization.name} <br/>
      <strong>Product:</strong> ${o.variant.product.title} <br/>
      <strong>Exception Note:</strong> ${o.exceptionNote || 'N/A'} <br/>
      <strong>Time in Exception:</strong> ${Math.floor((Date.now() - o.updatedAt.getTime()) / (1000 * 60 * 60))} hours
    </li>
  `).join('');

  const html = `
    <h2>Stale Exceptions Alert</h2>
    <p>The following ${staleOrders.length} orders have been in EXCEPTION status for more than 24 hours:</p>
    <ul>${orderListHtml}</ul>
    <p>Please log in to the Ops Console to resolve them.</p>
  `;

  // We don't have orgId/campaignId/recipientId for a generic ops alert, so we can just use the first order's org or a system placeholder for logging, but we're using sendEmailWithLog.
  // Actually, sendEmailWithLog requires organizationId, campaignId, recipientId.
  // Let's just use the first order's ids for logging purposes, or bypass the log if we can't.
  // Let's just use the first order's metadata for the log.
  
  await sendEmailWithLog({
    to: adminEmail,
    subject: `ALERT: ${staleOrders.length} Stale Exception Orders`,
    html
  }, staleOrders[0].organizationId, staleOrders[0].campaignId, staleOrders[0].recipientId);
}
