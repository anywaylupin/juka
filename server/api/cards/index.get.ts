import { and, desc, eq, lt, sql } from 'drizzle-orm'
import { cardListQuerySchema } from '#shared/schemas/card'
import type { CardListResponse } from '#shared/types/card'
import { cards, units } from '../../database/schema'

/**
 * Keyset pagination, never OFFSET: ids descending, the cursor is the last id
 * seen. Reading page 900 costs the same as page one.
 */
export default defineEventHandler(async (event): Promise<CardListResponse> => {
  const query = await getValidatedQuery(event, cardListQuerySchema.parse)
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  const conditions = [eq(cards.userId, userId)]

  if (query.unitId !== undefined) {
    conditions.push(eq(cards.unitId, query.unitId))
  }
  if (query.status !== undefined) {
    conditions.push(eq(cards.status, query.status))
  }
  if (query.hskLevel !== undefined) {
    conditions.push(eq(cards.hskLevel, query.hskLevel))
  }
  if (query.syllables !== undefined) {
    conditions.push(eq(cards.syllables, query.syllables))
  }
  if (query.cursor !== undefined) {
    conditions.push(lt(cards.id, query.cursor))
  }

  const match = query.q ? buildSearchMatch(query.q) : null
  if (match) {
    conditions.push(
      sql`${cards.id} in (select rowid from cards_fts where cards_fts match ${match})`
    )
  }

  // One row over the page size tells us whether another page exists.
  const rows = await db
    .select({
      id: cards.id,
      unitId: cards.unitId,
      unitName: units.name,
      hanzi: cards.hanzi,
      pinyin: cards.pinyin,
      pinyinPlain: cards.pinyinPlain,
      hanViet: cards.hanViet,
      translation: cards.translation,
      pos: cards.pos,
      hskLevel: cards.hskLevel,
      status: cards.status,
      syllables: cards.syllables,
      notes: cards.notes,
      createdAt: cards.createdAt,
      updatedAt: cards.updatedAt
    })
    .from(cards)
    .leftJoin(units, eq(units.id, cards.unitId))
    .where(and(...conditions))
    .orderBy(desc(cards.id))
    .limit(query.limit + 1)

  const hasMore = rows.length > query.limit
  const items = (hasMore ? rows.slice(0, query.limit) : rows).map(toCardRecord)
  const last = items[items.length - 1]

  return {
    items,
    nextCursor: hasMore && last ? last.id : null,
    hasMore
  }
})
