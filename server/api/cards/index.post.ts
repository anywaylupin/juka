import { eq } from 'drizzle-orm'
import { cardCreateSchema } from '#shared/schemas/card'
import type { CardRecord } from '#shared/types/card'
import { cards, units } from '../../database/schema'

export default defineEventHandler(async (event): Promise<CardRecord> => {
  const input = await readValidatedBody(event, cardCreateSchema.parse)
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  if (input.unitId) {
    await assertUnitBelongsToUser(db, input.unitId, userId)
  }

  const derived = deriveCardFields(input.hanzi, input.pinyin)

  const [created] = await db
    .insert(cards)
    .values({
      userId,
      unitId: input.unitId ?? null,
      hanzi: input.hanzi,
      hanViet: input.hanViet ?? null,
      translation: input.translation,
      pos: input.pos ?? null,
      hskLevel: input.hskLevel ?? null,
      status: input.status,
      notes: input.notes ?? null,
      ...derived
    })
    .returning()

  if (!created) {
    throw createError({ statusCode: 500, message: 'Card was not created' })
  }

  const unit = created.unitId
    ? (await db.select({ name: units.name }).from(units).where(eq(units.id, created.unitId)))[0]
    : undefined

  setResponseStatus(event, 201)

  return toCardRecord({ ...created, unitName: unit?.name ?? null })
})
