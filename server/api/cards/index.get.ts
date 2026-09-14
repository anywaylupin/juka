import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm'
import { cardListQuerySchema } from '#shared/schemas/card'
import type { CardListResponse } from '#shared/types/card'
import { cardGroups, cards } from '../../database/schema'

/**
 * Keyset pagination, never OFFSET: ids descending, the cursor is the last id
 * seen. Reading page 900 costs the same as page one.
 */
export default defineEventHandler(async (event): Promise<CardListResponse> => {
  const query = await getValidatedQuery(event, cardListQuerySchema.parse)
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  const conditions = [eq(cards.userId, userId)]

  if (query.rating !== undefined) {
    conditions.push(eq(cards.rating, query.rating))
  }
  if (query.pos !== undefined) {
    conditions.push(eq(cards.pos, query.pos))
  }
  if (query.groupId !== undefined) {
    conditions.push(
      inArray(cards.id, db.select({ id: cardGroups.cardId }).from(cardGroups).where(eq(cardGroups.groupId, query.groupId)))
    )
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
    .select()
    .from(cards)
    .where(and(...conditions))
    .orderBy(desc(cards.id))
    .limit(query.limit + 1)

  const hasMore = rows.length > query.limit
  const page = hasMore ? rows.slice(0, query.limit) : rows

  // One query for the whole page's group membership, not one per card.
  const byCard = await groupsForCards(db, page.map(row => row.id))
  const items = page.map(row => toCardRecord(row, byCard.get(row.id) ?? []))
  const last = items[items.length - 1]

  return {
    items,
    nextCursor: hasMore && last ? last.id : null,
    hasMore
  }
})
