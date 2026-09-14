import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

const createdAt = () =>
  integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`)

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** What you sign in with. Lowercased on write, so Lupin and lupin are one account. */
  username: text('username').notNull(),
  /**
   * scrypt, via nuxt-auth-utils' hashPassword. The salt and parameters travel
   * inside the string, so there is no second column to keep in step.
   */
  passwordHash: text('password_hash').notNull(),
  /** Optional. Nothing in the app needs it, and nothing emails you. */
  email: text('email'),
  /** Chosen citrus theme, persisted per user rather than only in local storage. */
  theme: text('theme').notNull().default('seville'),
  /**
   * The five rating names, as a JSON array, or null for the defaults.
   *
   * Text rather than a table: it is a fixed-length list of five strings that is
   * always read and written whole, which is a column, not a relation.
   */
  ratingLabels: text('rating_labels'),
  createdAt: createdAt()
}, table => [
  uniqueIndex('users_username_idx').on(table.username)
])

export const cards = sqliteTable('cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
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
  /**
   * The meaning in Vietnamese, or null.
   *
   * Filled from the bundled dictionary when the card is written, and editable,
   * because it is pivoted through the English gloss and a homograph pivots
   * wrong: 爱好 "to like" lands on giống, meaning "similar". Stored rather than
   * looked up at render, so a card keeps the wording it was filed with and a
   * later dictionary rebuild cannot silently reword it.
   */
  translationVi: text('translation_vi'),
  pos: text('pos'),

  /**
   * How well the user knows the card, 0 to 5, drawn as mandarins. Zero means
   * unrated, which is what a new card is. A label the user sets: it never
   * drives scheduling.
   */
  rating: integer('rating').notNull().default(0),
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
  index('cards_user_rating_idx').on(table.userId, table.rating),
  index('cards_user_syllables_idx').on(table.userId, table.syllables),
  /*
   * One card per word per owner. A box with 时间 in it twice is a box you stop
   * trusting, and the merge on sign-in leans on this to decide what to skip.
   * Enforced here as well as in the route, because a unique index is the only
   * check that survives a concurrent write.
   */
  uniqueIndex('cards_user_hanzi_idx').on(table.userId, table.hanzi)
])

/**
 * A user's own way of dividing the box: HSK 1, verbs to drill, words from the
 * news, whatever they want.
 *
 * This is the third attempt at grouping. Units were one-per-card folders and
 * were removed in migration 0002 because a card had to be filed somewhere and
 * a second place to keep tidy earned nothing. Groups are many-to-many and
 * optional, which is the difference: a card can be in none, and being in two is
 * not a conflict to resolve.
 */
export const groups = sqliteTable('groups', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  /** Hex, chosen by the user. Groups are theirs, so the colour is too. */
  colour: text('colour').notNull().default('#8c7f76'),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: createdAt()
}, table => [
  index('groups_user_order_idx').on(table.userId, table.orderIndex),
  // Two groups with the same name is a box you stop trusting, same reasoning as
  // one card per word.
  uniqueIndex('groups_user_name_idx').on(table.userId, table.name)
])

export const cardGroups = sqliteTable('card_groups', {
  cardId: integer('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' })
}, table => [
  uniqueIndex('card_groups_pair_idx').on(table.cardId, table.groupId),
  // Reading every card in a group is the whole point of a group.
  index('card_groups_group_idx').on(table.groupId)
])

/**
 * Vietnamese meanings, machine translated from the English gloss and kept.
 *
 * Keyed by hanzi and locale rather than by card, so the same word costs one
 * inference across the whole app no matter how many people file it.
 *
 * This is a cache of a translation, not a dictionary: there is no licensable
 * Chinese to Vietnamese source of usable quality, which is written up in
 * docs/licences.md. A user's own wording on a card always wins over this.
 */
export const translations = sqliteTable('translations', {
  hanzi: text('hanzi').notNull(),
  locale: text('locale').notNull(),
  text: text('text').notNull(),
  /** Which model produced it, so a model change can invalidate the cache. */
  model: text('model').notNull(),
  createdAt: createdAt()
}, table => [
  uniqueIndex('translations_key_idx').on(table.hanzi, table.locale)
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
  cards: many(cards),
  groups: many(groups)
}))

export const cardsRelations = relations(cards, ({ one, many }) => ({
  user: one(users, { fields: [cards.userId], references: [users.id] }),
  cardGroups: many(cardGroups)
}))

export const groupsRelations = relations(groups, ({ one, many }) => ({
  user: one(users, { fields: [groups.userId], references: [users.id] }),
  cardGroups: many(cardGroups)
}))

export const cardGroupsRelations = relations(cardGroups, ({ one }) => ({
  card: one(cards, { fields: [cardGroups.cardId], references: [cards.id] }),
  group: one(groups, { fields: [cardGroups.groupId], references: [groups.id] })
}))

export type User = typeof users.$inferSelect
export type Card = typeof cards.$inferSelect
export type Group = typeof groups.$inferSelect
export type Translation = typeof translations.$inferSelect
export type Story = typeof stories.$inferSelect
export type HealthCheck = typeof healthChecks.$inferSelect
