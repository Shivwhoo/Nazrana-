import path from 'node:path';
import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  migrate: {
    async adapter() {
      const { PrismaPostgres } = await import('@prisma/adapter-pg');
      const connectionString = process.env.DATABASE_URL!;

      return new PrismaPostgres({
        connectionString,
      });
    },
  },
});