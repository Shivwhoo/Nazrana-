import Redis from 'ioredis';

export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Shared instance if needed
export const createRedisClient = () => {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
  });
};

export const QUEUES = {
  CSV_IMPORT: 'csv-import',
  LEDGER_INTEGRITY: 'ledger-integrity',
  CAMPAIGN_FANOUT: 'campaign-fanout',
  REMINDERS: 'reminders',
  FULFILLMENT: 'fulfillment',
  STALE_EXCEPTIONS: 'stale-exceptions',
  CAMPAIGN_COMPLETION: 'campaign-completion',
} as const;
