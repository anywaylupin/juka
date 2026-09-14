import { count, eq } from 'drizzle-orm'
import { clampRating } from '#shared/constants/rating'
import type { CardStats } from '#shared/types/card'
import { cards } from '../../database/schema'

/**
 * Collection totals. One grouped pass, so the header does not cost a second
 * full read of the card list.
 *
 * This is a count of labels the user set. It is not progress toward anything
 * the app decided, and nothing here schedules a card.
 */
export default defineEventHandler(async (event): Promise<CardStats> => {
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  const rows = await db
    .select({ rating: cards.rating, total: count(cards.id) })
    .from(cards)
    .where(eq(cards.userId, userId))
    .groupBy(cards.rating)

  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let total = 0

  for (const row of rows) {
    counts[clampRating(row.rating)] = row.total
    total += row.total
  }

  return { total, counts }
})
