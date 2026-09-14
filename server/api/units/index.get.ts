import { and, count, eq, isNull } from 'drizzle-orm'
import type { CardStatus, UnitListResponse, UnitRecord } from '#shared/types/card'
import { cards, units } from '../../database/schema'

const emptyCounts = (): Record<CardStatus, number> => ({
  difficult: 0,
  hesitant: 0,
  good: 0,
  mastered: 0
})

export default defineEventHandler(async (event): Promise<UnitListResponse> => {
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  // One grouped pass gives every unit its ripeness breakdown for the ring.
  const rows = await db
    .select({
      id: units.id,
      name: units.name,
      orderIndex: units.orderIndex,
      status: cards.status,
      total: count(cards.id)
    })
    .from(units)
    .leftJoin(cards, eq(cards.unitId, units.id))
    .where(eq(units.userId, userId))
    .groupBy(units.id, cards.status)
    .orderBy(units.orderIndex, units.id)

  const byId = new Map<number, UnitRecord>()

  for (const row of rows) {
    const existing = byId.get(row.id) ?? {
      id: row.id,
      name: row.name,
      orderIndex: row.orderIndex,
      total: 0,
      counts: emptyCounts()
    }

    if (row.status) {
      existing.counts[row.status] = row.total
      existing.total += row.total
    }

    byId.set(row.id, existing)
  }

  const [unfiled] = await db
    .select({ total: count(cards.id) })
    .from(cards)
    .where(and(eq(cards.userId, userId), isNull(cards.unitId)))

  return {
    items: [...byId.values()],
    unfiled: unfiled?.total ?? 0
  }
})
