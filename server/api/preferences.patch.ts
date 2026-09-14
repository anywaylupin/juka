import { eq } from 'drizzle-orm'
import { preferencesUpdateSchema } from '#shared/schemas/preferences'
import type { ThemeName } from '#shared/constants/themes'
import { users } from '../database/schema'

/** The theme is persisted per user, not only in localStorage. */
export default defineEventHandler(async (event): Promise<{ theme: ThemeName }> => {
  const input = await readValidatedBody(event, preferencesUpdateSchema.parse)
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  const [updated] = await db
    .update(users)
    .set({ theme: input.theme })
    .where(eq(users.id, userId))
    .returning({ theme: users.theme })

  if (!updated) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  return { theme: updated.theme as ThemeName }
})
