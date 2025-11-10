import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

loadEnv({ path: resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('DATABASE_URL missing when loading Drizzle config');
}

console.log(`[drizzle.config] DATABASE_URL present: ${Boolean(databaseUrl)}`);

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl ?? ''
  }
});