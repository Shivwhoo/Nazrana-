import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { QUEUES } from '@gifting/shared/src/redis';
import { processCsvImport } from './jobs/csv-import';
import processLedgerIntegrity from './jobs/ledger-integrity';
import processCampaignFanout from './jobs/campaign-fanout';
import processReminders from './jobs/reminders';
import processFulfillment from './jobs/fulfillment';
import processStaleExceptions from './jobs/stale-exceptions';
import processCampaignCompletion from './jobs/campaign-completion';
import { FulfillmentService } from '../../api/src/services/fulfillment.service';
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 10) {
      console.error('[REDIS] Max retries reached. Stopping reconnection attempts.');
      return null;
    }
    return Math.min(times * 100, 3000);
  },
});

connection.on('connect', () => console.log('[REDIS] Worker connected successfully'));
connection.on('error', (err) => console.error(`[REDIS] Connection error: ${err.message}`));

const connectRedis = async () => {
  try {
    await connection.connect();
    console.log('Worker started. Listening for jobs...');

    // CSV Import Worker
    const csvWorker = new Worker(QUEUES.CSV_IMPORT, async job => {
      console.log(`[CSV-IMPORT] Processing job ${job.id} for importId ${job.data.importId}`);
      await processCsvImport(job.data.importId);
    }, { connection: connection as any });

    csvWorker.on('completed', job => {
      console.log(`[CSV-IMPORT] Job ${job.id} has completed!`);
    });

    csvWorker.on('failed', (job, err) => {
      console.log(`[CSV-IMPORT] Job ${job?.id} has failed with ${err.message}`);
    });

    // Ledger Integrity Worker
    const integrityWorker = new Worker(QUEUES.LEDGER_INTEGRITY, processLedgerIntegrity, { connection: connection as any });
    
    integrityWorker.on('completed', job => {
      console.log(`[LEDGER-INTEGRITY] Job ${job.id} completed.`);
    });
    
    integrityWorker.on('failed', (job, err) => {
      console.error(`[LEDGER-INTEGRITY] Job ${job?.id} failed: ${err.message}`);
    });

    // Schedule the repeatable job (runs every night at midnight)
    const integrityQueue = new (require('bullmq').Queue)(QUEUES.LEDGER_INTEGRITY, { connection: connection as any });
    await integrityQueue.add('ledger-integrity-check', {}, {
      repeat: {
        pattern: '0 0 * * *' // Nightly at midnight
      }
    });

    // Reminders Worker
    const remindersWorker = new Worker(QUEUES.REMINDERS, processReminders, { connection: connection as any });
    
    remindersWorker.on('completed', job => {
      console.log(`[REMINDERS] Job ${job.id} completed.`);
    });
    
    remindersWorker.on('failed', (job, err) => {
      console.error(`[REMINDERS] Job ${job?.id} failed: ${err.message}`);
    });

    const remindersQueue = new (require('bullmq').Queue)(QUEUES.REMINDERS, { connection: connection as any });
    await remindersQueue.add('daily-reminders', {}, {
      repeat: {
        pattern: '0 8 * * *' // Daily at 8 AM
      }
    });

    // Campaign Fan-out Worker
    const fanoutWorker = new Worker(QUEUES.CAMPAIGN_FANOUT, processCampaignFanout, { connection: connection as any });
    
    fanoutWorker.on('completed', job => {
      console.log(`[CAMPAIGN-FANOUT] Job ${job.id} completed.`);
    });
    
    fanoutWorker.on('failed', (job, err) => {
      console.error(`[CAMPAIGN-FANOUT] Job ${job?.id} failed: ${err.message}`);
    });

    // Fulfillment Worker
    const fulfillmentWorker = new Worker(QUEUES.FULFILLMENT, processFulfillment, { 
      connection: connection as any,
      // Default job options are often set on Queue side, but we can also set worker limits if needed
    });
    
    fulfillmentWorker.on('completed', job => {
      console.log(`[FULFILLMENT] Job ${job.id} (Order ${job.data.orderId}) completed successfully.`);
    });
    
    fulfillmentWorker.on('failed', async (job, err) => {
      console.error(`[FULFILLMENT] Job ${job?.id} failed: ${err.message}`);
      
      if (job && job.attemptsMade >= 5) {
        console.error(`[FULFILLMENT] Order ${job.data.orderId} reached terminal failure limit. Logging EXCEPTION.`);
        try {
          await FulfillmentService.handleTerminalFailure(job.data.orderId, err.message);
        } catch (e: any) {
          console.error(`[FULFILLMENT] Failed to log terminal failure for order ${job.data.orderId}: ${e.message}`);
        }
      }
    });

    // Stale Exceptions Worker
    const staleExceptionsWorker = new Worker(QUEUES.STALE_EXCEPTIONS, processStaleExceptions, { connection: connection as any });
    
    staleExceptionsWorker.on('completed', job => {
      console.log(`[STALE-EXCEPTIONS] Job ${job.id} completed.`);
    });
    
    staleExceptionsWorker.on('failed', (job, err) => {
      console.error(`[STALE-EXCEPTIONS] Job ${job?.id} failed: ${err.message}`);
    });

    const staleExceptionsQueue = new (require('bullmq').Queue)(QUEUES.STALE_EXCEPTIONS, { connection: connection as any });
    await staleExceptionsQueue.add('stale-exceptions-check', {}, {
      repeat: {
        pattern: '0 */6 * * *' // Every 6 hours
      }
    });

    // Campaign Completion Worker
    const campaignCompletionWorker = new Worker(QUEUES.CAMPAIGN_COMPLETION, processCampaignCompletion, { connection: connection as any });
    
    campaignCompletionWorker.on('completed', job => {
      console.log(`[CAMPAIGN-COMPLETION] Job ${job.id} completed.`);
    });
    
    campaignCompletionWorker.on('failed', (job, err) => {
      console.error(`[CAMPAIGN-COMPLETION] Job ${job?.id} failed: ${err.message}`);
    });

    const campaignCompletionQueue = new (require('bullmq').Queue)(QUEUES.CAMPAIGN_COMPLETION, { connection: connection as any });
    await campaignCompletionQueue.add('campaign-completion-check', {}, {
      repeat: {
        pattern: '0 * * * *' // Every hour
      }
    });

  } catch (error: any) {
    console.error(`[REDIS] Failed to start worker: ${error.message}`);
  }
};

connectRedis();
