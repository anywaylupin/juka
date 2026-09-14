import { and, eq } from 'drizzle-orm'
import { unitIdSchema } from '#shared/schemas/unit'
import { units } from '../../database/schema'

/**
 * Cards in the unit are not deleted. The foreign key sets their unit_id to
 * null, so they fall back into the unfiled pile.
 */
export default defineEventHandler(async (event): Promise<{ deleted: number }> => {
  const { id } = await getValidatedRouterParams(event, unitIdSchema.parse)
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  const deleted = await db
    .delete(units)
    .where(and(eq(units.id, id), eq(units.userId, userId)))
    .returning({ id: units.id })

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, message: 'Unit not found' })
  }

  return { deleted: deleted.length }
})
