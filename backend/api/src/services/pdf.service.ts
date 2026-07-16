import PDFDocument from 'pdfkit';
import { prisma } from '../prisma';

export class PdfService {
  static async generateInvoicePdf(invoiceId: string, orgId: string): Promise<Buffer> {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, organizationId: orgId },
      include: { organization: true }
    });

    if (!invoice) throw new Error('Invoice not found');

    const org = invoice.organization;
    const totals = invoice.totals as any;
    const breakdown = invoice.gstBreakdown as any[];

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('TAX INVOICE', { align: 'center' });
        doc.moveDown();

        // Details
        doc.fontSize(10).font('Helvetica-Bold').text('From:');
        doc.font('Helvetica').text('Nazrana Inc.');
        doc.text('GSTIN: 29ABCDE1234F1Z5');
        doc.moveDown();

        doc.font('Helvetica-Bold').text('To:');
        doc.font('Helvetica').text(org.name);
        doc.text(`GSTIN: ${org.gstin}`);
        doc.text(`State Code: ${org.stateCode}`);
        doc.moveDown();

        doc.font('Helvetica-Bold').text(`Invoice Number: ${invoice.number}`);
        doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
        doc.moveDown(2);

        // Table Header
        const tableTop = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Description', 50, tableTop);
        doc.text('HSN', 200, tableTop);
        doc.text('Qty', 250, tableTop);
        doc.text('Unit Price', 290, tableTop);
        doc.text('Taxable', 350, tableTop);
        doc.text('IGST', 420, tableTop);
        doc.text('Total', 480, tableTop, { width: 70, align: 'right' });

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Table Rows
        let y = tableTop + 25;
        doc.font('Helvetica');

        breakdown.forEach((item) => {
          doc.text(item.title, 50, y, { width: 140 });
          doc.text(item.hsnCode, 200, y);
          doc.text(item.qty.toString(), 250, y);
          doc.text(`Rs ${(item.unitPriceCents / 100).toFixed(2)}`, 290, y);
          doc.text(`Rs ${(item.taxableValueCents / 100).toFixed(2)}`, 350, y);
          doc.text(`Rs ${(item.igstCents / 100).toFixed(2)}`, 420, y);
          doc.text(`Rs ${(item.totalCents / 100).toFixed(2)}`, 480, y, { width: 70, align: 'right' });
          y += 20;
        });

        doc.moveTo(50, y).lineTo(550, y).stroke();
        y += 15;

        // Totals
        doc.font('Helvetica-Bold');
        doc.text('Total Taxable Value:', 350, y);
        doc.text(`Rs ${(totals.taxableValueCents / 100).toFixed(2)}`, 480, y, { width: 70, align: 'right' });
        y += 15;

        doc.text('Total IGST:', 350, y);
        doc.text(`Rs ${(totals.igstCents / 100).toFixed(2)}`, 480, y, { width: 70, align: 'right' });
        y += 15;

        doc.text('Grand Total:', 350, y);
        doc.text(`Rs ${(totals.totalAmountCents / 100).toFixed(2)}`, 480, y, { width: 70, align: 'right' });
        
        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }
}
