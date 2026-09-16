import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import type { H3Event } from 'h3';
import * as schema from '../database/schema';

export type JukaDatabase = DrizzleD1Database<typeof schema>;

/**
 * Only place in the codebase that touches the raw D1 binding.
 * Handlers take the drizzle instance and never reach into event.context themselves.
 */
export function useDrizzle(event: H3Event): JukaDatabase {
  const binding = event.context.cloudflare?.env?.DB;

  if (!binding) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Database unavailable',
      message: 'D1 binding DB is missing. Check d1_databases in wrangler.jsonc.'
    });
  }

  return drizzle(binding, { schema });
}
