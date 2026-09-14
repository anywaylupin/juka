import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * The real schema (users, units, cards, stories, story_cards, audio) lands after
 * the FTS5 trigram spike settles the search design. Until then this table exists
 * to prove the binding, the migration runner, and the query path work end to end.
 */
export const healthChecks = sqliteTable('health_checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

export type HealthCheck = typeof healthChecks.$inferSelect
