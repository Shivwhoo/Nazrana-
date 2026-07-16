import { parse } from 'csv-parse';
import { z } from 'zod';
import { createHash } from 'crypto';
import { recipientRowSchema, RecipientRow } from '@gifting/shared';

// For simplicity, defining prisma client here since worker might not have it in its src tree.
// Actually, backend/worker usually needs its own Prisma client or accesses a shared one.
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

export async function processCsvImport(importId: string) {
  const importRec = await db.recipientImport.findUnique({
    where: { id: importId }
  });

  if (!importRec) {
    throw new Error(`Import ${importId} not found`);
  }

  if (!importRec.rawContent) {
    throw new Error(`Import ${importId} has no rawContent`);
  }

  await db.recipientImport.update({
    where: { id: importId },
    data: { status: 'PROCESSING' }
  });

  const raw = importRec.rawContent;
  const campaignId = importRec.campaignId;

  // We will stream it using csv-parse
  return new Promise<void>((resolve, reject) => {
    const records: any[] = [];
    
    const parser = parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });

    parser.on('readable', function () {
      let record;
      while ((record = parser.read()) !== null) {
        records.push(record);
      }
    });

    parser.on('error', async function (err) {
      await db.recipientImport.update({
        where: { id: importId },
        data: {
          status: 'FAILED',
          errorReport: [{ row: 0, error: 'CSV Parse Error: ' + err.message }]
        }
      });
      reject(err);
    });

    parser.on('end', async function () {
      try {
        if (records.length > 10000) {
          await db.recipientImport.update({
            where: { id: importId },
            data: {
              status: 'FAILED',
              errorReport: [{ row: 0, error: 'File exceeds 10,000 row limit.' }]
            }
          });
          return resolve();
        }

        const validRecipients: RecipientRow[] = [];
        const errorReport: { row: number; error: string }[] = [];
        const seenEmails = new Set<string>();
        
        let rowNum = 1; // 1-indexed for users (header is usually row 1, data starts at 2, but let's just index data rows)
        
        for (const record of records) {
          rowNum++;
          const parseResult = recipientRowSchema.safeParse(record);
          
          if (!parseResult.success) {
            errorReport.push({
              row: rowNum,
              error: parseResult.error.errors.map((e: any) => e.message).join(', ')
            });
            continue;
          }

          const { email, name, phone } = parseResult.data;
          const normalizedEmail = email.toLowerCase().trim();

          if (seenEmails.has(normalizedEmail)) {
            errorReport.push({
              row: rowNum,
              error: `Duplicate email within file: ${normalizedEmail}`
            });
            continue;
          }

          // Check if already in campaign
          const existing = await db.recipient.findUnique({
            where: { campaignId_email: { campaignId, email: normalizedEmail } }
          });

          if (existing) {
            errorReport.push({
              row: rowNum,
              error: `Email already exists in this campaign: ${normalizedEmail}`
            });
            continue;
          }

          seenEmails.add(normalizedEmail);
          validRecipients.push({ name, email: normalizedEmail, phone });
        }

        // Insert in batches
        let processed = 0;
        const batchSize = 100;
        
        for (let i = 0; i < validRecipients.length; i += batchSize) {
          const batch = validRecipients.slice(i, i + batchSize);
          
          await db.recipient.createMany({
            data: batch.map(r => {
              // Generate tokenHash
              const token = createHash('sha256').update(Math.random().toString() + Date.now().toString()).digest('hex');
              return {
                campaignId,
                name: r.name,
                email: r.email,
                phone: r.phone,
                tokenHash: token,
                status: 'INVITED'
              };
            }),
            skipDuplicates: true // Just in case
          });

          processed += batch.length;
          
          // Update progress
          await db.recipientImport.update({
            where: { id: importId },
            data: { processedRows: processed }
          });
        }

        await db.recipientImport.update({
          where: { id: importId },
          data: {
            status: 'COMPLETED',
            totalRows: records.length,
            processedRows: processed,
            errorReport: errorReport.length > 0 ? errorReport : undefined,
            rawContent: null // Erase PII
          }
        });

        resolve();
      } catch (err: any) {
        await db.recipientImport.update({
          where: { id: importId },
          data: {
            status: 'FAILED',
            errorReport: [{ row: 0, error: 'Internal processing error: ' + err.message }]
          }
        });
        reject(err);
      }
    });

    parser.write(raw);
    parser.end();
  });
}
