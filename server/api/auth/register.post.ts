import { eq } from 'drizzle-orm'
import { registerSchema } from '#shared/schemas/auth'
import { DEFAULT_THEME } from '#shared/constants/themes'
import type { AccountRecord } from '#shared/types/auth'
import { users } from '../../database/schema'

export default defineEventHandler(async (event): Promise<AccountRecord> => {
  const input = await readValidatedBody(event, registerSchema.parse)
  const db = useDrizzle(event)

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, input.username))

  if (existing) {
    throw createError({ statusCode: 409, message: 'That username is taken' })
  }

  const [created] = await db
    .insert(users)
    .values({
      username: input.username,
      passwordHash: await hashPassword(input.password),
      email: input.email ?? null,
      theme: DEFAULT_THEME
    })
    .returning()

  if (!created) {
    throw createError({ statusCode: 500, message: 'Account was not created' })
  }

  await setUserSession(event, { user: { id: created.id, username: created.username } })
  setResponseStatus(event, 201)

  return toAccount(created)
})
