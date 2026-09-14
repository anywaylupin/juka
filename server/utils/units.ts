import { and, eq } from 'drizzle-orm'
import { units } from '../database/schema'
import type { JukaDatabase } from './db'

/**
 * Guards against a card being filed into someone else's unit. Every route that
 * accepts a unitId calls this before writing.
 */
export async function assertUnitBelongsToUser(
  db: JukaDatabase,
  unitId: number,
  userId: number
): Promise<void> {
  const [unit] = await db
    .select({ id: units.id })
    .from(units)
    .where(and(eq(units.id, unitId), eq(units.userId, userId)))

  if (!unit) {
    throw createError({ statusCode: 404, message: 'Unit not found' })
  }
}
