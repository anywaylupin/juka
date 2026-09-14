import type { H3Event } from 'h3'

/**
 * Auth is not built yet, and the build order puts it after the card UI. Until
 * it ships the app runs as a single owner, seeded by migration 0001.
 *
 * Every query already filters by this id, so turning on real sessions later is
 * a change to this function and nothing else.
 */
const SINGLE_OWNER_ID = 1

/*
 * nuxt-auth-utils exposes User as an empty interface meant to be augmented, but
 * it is re-exported from #auth-utils rather than declared there, so a module
 * augmentation against that alias silently does not merge. Reading the shape
 * structurally works today and keeps working once auth adds the real fields.
 */
interface SessionUser {
  id?: number
}

export async function requireUserId(event: H3Event): Promise<number> {
  const session = await getUserSession(event)
  const user: SessionUser | undefined = session.user

  return user?.id ?? SINGLE_OWNER_ID
}
