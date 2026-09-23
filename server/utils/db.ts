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

/**
 * Reads an `in (...)` list in slices, because D1 refuses a statement with more than 100 bound parameters.
 * 90 leaves room for the handful of other parameters in the same statement, a user id most of the time.
 *
 * This is not a theoretical limit. A 150 card account answered 500 on `/api/cards?limit=200` in production and 200 locally, and the only difference was that the local box held fewer than a hundred cards.
 */
export async function inSlices<T, R>(values: T[], run: (slice: T[]) => Promise<R[]>, size = 90): Promise<R[]> {
  const out: R[] = [];

  for (let index = 0; index < values.length; index += size) {
    out.push(...(await run(values.slice(index, index + size))));
  }

  return out;
}
