import { and, eq } from 'drizzle-orm'
import { cardIdSchema } from '#shared/schemas/card'
import type { CardRecord } from '#shared/types/card'
import { cards, units } from '../../database/schema'

export default defineEventHandler(async (event): Promise<CardRecord> => {
  const { id } = await getValidatedRouterParams(event, cardIdSchema.parse)
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  const [row] = await db
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
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))

  if (!row) {
    throw createError({ statusCode: 404, message: 'Card not found' })
  }

  return toCardRecord(row)
})
