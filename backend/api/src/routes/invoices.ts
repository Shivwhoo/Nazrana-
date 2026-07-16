import { Router } from 'express';
import { prisma } from '../prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { logError } from '../utils/logger';
import { PdfService } from '../services/pdf.service';

export const invoicesRouter = Router({ mergeParams: true });

invoicesRouter.use(authMiddleware);

// Get list of invoices for org
invoicesRouter.get('/', requireRole(['OWNER', 'ADMIN', 'FINANCE', 'MEMBER']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const invoices = await prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ invoices });
  } catch (error) {
    logError('GET /invoices', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Download PDF
invoicesRouter.get('/:id/pdf', requireRole(['OWNER', 'ADMIN', 'FINANCE', 'MEMBER']), async (req: AuthRequest, res) => {
  try {
    const orgId = req.params.orgId;
    const invoiceId = req.params.id;

    const pdfBuffer = await PdfService.generateInvoicePdf(invoiceId, orgId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoiceId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.end(pdfBuffer);
  } catch (error: any) {
    if (error.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    logError('GET /invoices/:id/pdf', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
