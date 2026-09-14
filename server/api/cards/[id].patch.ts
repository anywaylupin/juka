import { and, eq } from 'drizzle-orm'
import { cardIdSchema, cardUpdateSchema } from '#shared/schemas/card'
import type { CardRecord } from '#shared/types/card'
import { cards, units } from '../../database/schema'

export default defineEventHandler(async (event): Promise<CardRecord> => {
  const { id } = await getValidatedRouterParams(event, cardIdSchema.parse)
  const input = await readValidatedBody(event, cardUpdateSchema.parse)
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  const [existing] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Card not found' })
  }

  if (input.unitId) {
    await assertUnitBelongsToUser(db, input.unitId, userId)
  }

  const hanzi = input.hanzi ?? existing.hanzi
  const suppliedPinyin = input.pinyin ?? (input.hanzi ? undefined : existing.pinyin)

  // Re-derive whenever the hanzi or the pinyin moved, so the search columns
  // cannot drift from what the card says.
  const derived = input.hanzi !== undefined || input.pinyin !== undefined
    ? deriveCardFields(hanzi, suppliedPinyin)
    : {}

  const [updated] = await db
    .update(cards)
    .set({
      ...(input.hanzi !== undefined && { hanzi: input.hanzi }),
      ...(input.unitId !== undefined && { unitId: input.unitId }),
      ...(input.hanViet !== undefined && { hanViet: input.hanViet }),
      ...(input.translation !== undefined && { translation: input.translation }),
      ...(input.pos !== undefined && { pos: input.pos }),
      ...(input.hskLevel !== undefined && { hskLevel: input.hskLevel }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...derived,
      updatedAt: new Date()
    })
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Card not found' })
  }

  const unit = updated.unitId
    ? (await db.select({ name: units.name }).from(units).where(eq(units.id, updated.unitId)))[0]
    : undefined

  return toCardRecord({ ...updated, unitName: unit?.name ?? null })
})
