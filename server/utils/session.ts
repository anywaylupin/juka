import type { H3Event } from 'h3';

/**
 * Who is asking.
 *
 * The app is usable signed out, but not through this API: a signed out visitor keeps their cards in local storage and never calls a card route at all.
 * So every route behind this either has a real session or gets a 401, and there is no fallback owner any more.
 * The single owner seeded by migration 0001 was removed in 0006.
 */

/*
 * nuxt-auth-utils exposes User as an empty interface meant to be augmented, but it is re-exported from #auth-utils rather than declared there, so a module augmentation against that alias silently does not merge.
 * Reading the shape structurally works and keeps working.
 */
export interface SessionUser {
  id: number;
  username: string;
}

/** The signed in user, or null. Use this where signed out is a valid answer. */
export async function getCurrentUser(event: H3Event): Promise<SessionUser | null> {
  const session = await getUserSession(event);
  const user = session.user as SessionUser | undefined;

  return user?.id ? user : null;
}

/** The signed in user's id, or a 401. Use this on anything that touches a card. */
export async function requireUserId(event: H3Event): Promise<number> {
  const user = await getCurrentUser(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not signed in',
      message: 'Sign in to use the cards stored on your account.'
    });
  }

  return user.id;
}
