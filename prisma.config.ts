import 'dotenv/config'
import { defineConfig, env } from 'prisma/config';

// Migrations must run against a direct Postgres connection, not a pooler.
// Supabase's PgBouncer (port 6543, transaction mode) doesn't support the
// advisory locks Prisma uses to coordinate migrations, so `prisma migrate
// deploy` will hang forever if pointed at the pooler. Prefer DIRECT_URL when
// set (production / Supabase); fall back to DATABASE_URL for local dev where
// both URLs are typically the same direct connection.
const migrationUrl = process.env.DIRECT_URL
  ? env('DIRECT_URL')
  : env('DATABASE_URL');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: migrationUrl,
  },
});