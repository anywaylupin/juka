import { and, eq } from 'drizzle-orm'
import { unitIdSchema, unitUpdateSchema } from '#shared/schemas/unit'
import { units } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, unitIdSchema.parse)
  const input = await readValidatedBody(event, unitUpdateSchema.parse)
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  const [updated] = await db
    .update(units)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.orderIndex !== undefined && { orderIndex: input.orderIndex })
    })
    .where(and(eq(units.id, id), eq(units.userId, userId)))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Unit not found' })
  }

  return { id: updated.id, name: updated.name, orderIndex: updated.orderIndex }
})
