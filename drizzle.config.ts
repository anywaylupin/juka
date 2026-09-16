import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema.ts',
  // Same directory wrangler applies from, so one set of migrations serves both.
  out: './server/database/migrations',
  casing: 'snake_case',
  strict: true,
  verbose: true
});
