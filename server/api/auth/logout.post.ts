/**
 * Signing out clears the session and nothing else.
 *
 * The cards stay on the account, and the browser drops back to whatever is in
 * local storage, which was never touched while signed in. That is the whole
 * contract: signing in copies local cards up, it does not move them.
 */
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  await clearUserSession(event)
  return { ok: true }
})
