import { eq } from 'drizzle-orm'
import type { SessionResponse } from '#shared/types/auth'
import { users } from '../../database/schema'

/**
 * Who is signed in, if anyone. Signed out is a normal answer here, not a 401,
 * because the whole app has to render for someone who has never had an account.
 */
export default defineEventHandler(async (event): Promise<SessionResponse> => {
  const current = await getCurrentUser(event)

  if (!current) {
    return { account: null }
  }

  const db = useDrizzle(event)
  const [account] = await db.select().from(users).where(eq(users.id, current.id))

  // The session outlived the account, so the cookie is stale. Clear it rather
  // than reporting a user that no longer exists.
  if (!account) {
    await clearUserSession(event)
    return { account: null }
  }

  return { account: toAccount(account) }
})
