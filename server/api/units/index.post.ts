import { count, eq } from 'drizzle-orm'
import { unitCreateSchema } from '#shared/schemas/unit'
import type { UnitRecord } from '#shared/types/card'
import { units } from '../../database/schema'

export default defineEventHandler(async (event): Promise<UnitRecord> => {
  const input = await readValidatedBody(event, unitCreateSchema.parse)
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  // New units land at the end unless the caller placed them.
  const [existing] = await db
    .select({ total: count(units.id) })
    .from(units)
    .where(eq(units.userId, userId))

  const [created] = await db
    .insert(units)
    .values({
      userId,
      name: input.name,
      orderIndex: input.orderIndex ?? existing?.total ?? 0
    })
    .returning()

  if (!created) {
    throw createError({ statusCode: 500, message: 'Unit was not created' })
  }

  setResponseStatus(event, 201)

  return {
    id: created.id,
    name: created.name,
    orderIndex: created.orderIndex,
    total: 0,
    counts: { difficult: 0, hesitant: 0, good: 0, mastered: 0 }
  }
})
