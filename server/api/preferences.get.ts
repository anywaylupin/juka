import { eq } from 'drizzle-orm'
import { DEFAULT_THEME, type ThemeName } from '#shared/constants/themes'
import { users } from '../database/schema'

export default defineEventHandler(async (event): Promise<{ theme: ThemeName }> => {
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  const [user] = await db
    .select({ theme: users.theme })
    .from(users)
    .where(eq(users.id, userId))

  return { theme: (user?.theme as ThemeName | undefined) ?? DEFAULT_THEME }
})
