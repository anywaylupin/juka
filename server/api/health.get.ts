import { count, sql } from 'drizzle-orm';
import { healthQuerySchema } from '#shared/schemas/health';
import type { DatabaseProbe, HealthResponse, StorageProbe } from '#shared/types/health';
import { healthChecks } from '../database/schema';
import type { H3Event } from 'h3';

/**
 * Proves the deployment end to end: bindings resolve, drizzle talks to D1, the migration ran, and R2 answers.
 * Read only, so it is safe to poll.
 */
export default defineEventHandler(async (event): Promise<HealthResponse> => {
  const { probe } = await getValidatedQuery(event, healthQuerySchema.parse);

  const database = probe === 'all' || probe === 'db' ? await probeDatabase(event) : null;
  const storage = probe === 'all' || probe === 'r2' ? await probeStorage(event) : null;
  const ok = (database?.ok ?? true) && (storage?.ok ?? true);
  if (!ok) {
    setResponseStatus(event, 503);
  }

  return {
    ok,
    service: 'juka',
    release: useRuntimeConfig(event).public.releaseCodename,
    checkedAt: new Date().toISOString(),
    database,
    storage
  };
});

async function probeDatabase(event: H3Event): Promise<DatabaseProbe> {
  const startedAt = Date.now();

  try {
    const db = useDrizzle(event);

    // Raw SQL proves the driver, the query builder proves the schema binding.
    // D1 blocks sqlite_version(), so the migration count stands in as the evidence that the database is the one the migrations ran against.
    const [meta] = await db.all<{ tables: number; migrations: number }>(sql`
      select (select count(*) from sqlite_master where type = 'table') as tables,
             (select count(*) from sqlite_master where type = 'table' and name = 'd1_migrations') as migrations
    `);
    const [rows] = await db.select({ value: count() }).from(healthChecks);

    const migrationsApplied = meta?.migrations
      ? ((await db.all<{ applied: number }>(sql`select count(*) as applied from d1_migrations`))[0]?.applied ?? null)
      : null;

    return {
      ok: true,
      detail: 'D1 binding resolved, migration applied, query returned',
      durationMs: Date.now() - startedAt,
      tableCount: meta?.tables ?? null,
      migrationsApplied,
      healthCheckRows: rows?.value ?? null
    };
  } catch (error) {
    return {
      ok: false,
      detail: describeError(error),
      durationMs: Date.now() - startedAt,
      tableCount: null,
      migrationsApplied: null,
      healthCheckRows: null
    };
  }
}

async function probeStorage(event: H3Event): Promise<StorageProbe> {
  const startedAt = Date.now();

  try {
    const bucket = useAudioBucket(event);
    const listed = await bucket.list({ limit: 1 });

    return {
      ok: true,
      detail: 'R2 binding resolved and bucket listed',
      durationMs: Date.now() - startedAt,
      bucketReachable: true,
      sampleObjectKey: listed.objects[0]?.key ?? null
    };
  } catch (error) {
    return {
      ok: false,
      detail: describeError(error),
      durationMs: Date.now() - startedAt,
      bucketReachable: false,
      sampleObjectKey: null
    };
  }
}

/**
 * Drizzle wraps a failed query in "Failed query: ..." and hides the D1 message on the cause, which is the only part worth reading.
 * Unwrap it.
 */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = error.cause;
  if (cause instanceof Error && cause.message) {
    return `${error.message.split('\n')[0]} (${cause.message})`;
  }

  return error.message.split('\n')[0] ?? error.message;
}
