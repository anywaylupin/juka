import { eq } from 'drizzle-orm';
import { passwordResetSchema } from '#shared/schemas/auth';
import type { AccountRecord } from '#shared/types/auth';
import { passwordResets, users } from '../../database/schema';

/**
 * Spend a reset link and set a new password.
 *
 * Signing the person in afterwards is deliberate: they have just proved they hold the address the account was registered with, and sending them back to a login form to type the password they set four seconds ago is a step that protects nobody.
 */
export default defineEventHandler(async (event): Promise<AccountRecord> => {
  const input = await readValidatedBody(event, passwordResetSchema.parse);
  const db = useDrizzle(event);

  const [reset] = await db
    .select()
    .from(passwordResets)
    .where(eq(passwordResets.tokenHash, await hashResetToken(input.token)));

  const expired = reset ? reset.expiresAt.getTime() < Date.now() : true;

  if (!reset || reset.usedAt || expired) {
    throw createError({ statusCode: 400, message: 'That reset link has expired. Ask for a new one.' });
  }

  const [account] = await db
    .update(users)
    .set({ passwordHash: await hashPassword(input.password) })
    .where(eq(users.id, reset.userId))
    .returning();

  if (!account) {
    throw createError({ statusCode: 404, message: 'Account not found' });
  }

  // Every link for this account goes, not just the one that was spent, so an older email cannot be used after a newer one.
  await db.delete(passwordResets).where(eq(passwordResets.userId, account.id));
  await setUserSession(event, { user: { id: account.id, username: account.username } });

  return toAccount(account, await providersFor(event, account.id));
});
