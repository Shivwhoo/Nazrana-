import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),
  migrate: {
    async adapter() {
      const { PrismaPostgres } = await import('@prisma/adapter-pg');
      const connectionString = process.env.DATABASE_URL!;
      return new PrismaPostgres({ connectionString });
    },
  },
});
