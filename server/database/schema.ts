import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Card status is a label the user sets. It never drives scheduling, and the
 * four colours that render it are fixed across every theme.
 */
export const CARD_STATUSES = ['difficult', 'hesitant', 'good', 'mastered'] as const
export type CardStatus = typeof CARD_STATUSES[number]

const createdAt = () =>
  integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  /** Chosen citrus theme, persisted per user rather than only in localStorage. */
  theme: text('theme').notNull().default('ponkan'),
  createdAt: createdAt()
}, table => [
  uniqueIndex('users_email_idx').on(table.email)
])

export const units = sqliteTable('units', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: createdAt()
}, table => [
  index('units_user_order_idx').on(table.userId, table.orderIndex)
])

export const cards = sqliteTable('cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  unitId: integer('unit_id').references(() => units.id, { onDelete: 'set null' }),

  hanzi: text('hanzi').notNull(),
  pinyin: text('pinyin').notNull().default(''),
  /** Tone stripped and lowercased, so typing jiu finds 就. Derived on write. */
  pinyinPlain: text('pinyin_plain').notNull().default(''),
  /** Sino-Vietnamese reading. Nullable until the mapping is seeded. */
  hanViet: text('han_viet'),

  /*
   * Two derived search columns, both written by deriveCardFields and never by
   * hand. cards_fts mirrors them through triggers, which is why they live on
   * cards rather than being computed at query time.
   *
   * hanziChars holds the characters separated by spaces (时间 becomes 时 间) so
   * a standard FTS5 tokenizer can index CJK. See docs/fts5-spike.md.
   * pinyinSearch holds the joined form and the syllables (shijian shi jian) so
   * both a full word and a single syllable match.
   */
  hanziChars: text('hanzi_chars').notNull().default(''),
  pinyinSearch: text('pinyin_search').notNull().default(''),

  translation: text('translation').notNull().default(''),
  pos: text('pos'),
  hskLevel: integer('hsk_level'),

  status: text('status').$type<CardStatus>().notNull().default('difficult'),
  /** Character count, derived on write so it can be filtered without a scan. */
  syllables: integer('syllables').notNull().default(0),
  notes: text('notes'),

  createdAt: createdAt(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)
}, table => [
  // Keyset pagination reads this index: filter by owner, walk id descending.
  index('cards_user_id_idx').on(table.userId, table.id),
  index('cards_user_unit_idx').on(table.userId, table.unitId),
  index('cards_user_status_idx').on(table.userId, table.status),
  index('cards_user_syllables_idx').on(table.userId, table.syllables),
  index('cards_user_hsk_idx').on(table.userId, table.hskLevel)
])

export const stories = sqliteTable('stories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  titleZh: text('title_zh').notNull(),
  titleEn: text('title_en').notNull().default(''),
  hskLevel: integer('hsk_level'),
  body: text('body').notNull().default(''),
  isExample: integer('is_example', { mode: 'boolean' }).notNull().default(false),
  createdAt: createdAt()
}, table => [
  index('stories_user_idx').on(table.userId, table.id)
])

export const storyCards = sqliteTable('story_cards', {
  storyId: integer('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  cardId: integer('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' })
}, table => [
  uniqueIndex('story_cards_pair_idx').on(table.storyId, table.cardId)
])

/**
 * Keyed by content hash rather than by card, so the same word across users
 * shares one object in R2.
 */
export const audio = sqliteTable('audio', {
  hanziHash: text('hanzi_hash').primaryKey(),
  r2Key: text('r2_key').notNull(),
  voice: text('voice').notNull(),
  createdAt: createdAt()
})

/**
 * Kept from the bootstrap so /api/health can prove the binding, the migration
 * runner, and the query path without depending on user data.
 */
export const healthChecks = sqliteTable('health_checks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date())
})

export const usersRelations = relations(users, ({ many }) => ({
  units: many(units),
  cards: many(cards)
}))

export const unitsRelations = relations(units, ({ one, many }) => ({
  user: one(users, { fields: [units.userId], references: [users.id] }),
  cards: many(cards)
}))

export const cardsRelations = relations(cards, ({ one }) => ({
  user: one(users, { fields: [cards.userId], references: [users.id] }),
  unit: one(units, { fields: [cards.unitId], references: [units.id] })
}))

export type User = typeof users.$inferSelect
export type Unit = typeof units.$inferSelect
export type Card = typeof cards.$inferSelect
export type Story = typeof stories.$inferSelect
export type HealthCheck = typeof healthChecks.$inferSelect
