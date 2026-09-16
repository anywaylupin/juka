import { eq } from 'drizzle-orm';
import { loginSchema } from '#shared/schemas/auth';
import type { AccountRecord } from '#shared/types/auth';
import { users } from '../../database/schema';

export default defineEventHandler(async (event): Promise<AccountRecord> => {
  const input = await readValidatedBody(event, loginSchema.parse);
  const db = useDrizzle(event);

  const [account] = await db.select().from(users).where(eq(users.username, input.username));

  /*
   * One message for both an unknown username and a wrong password, so the form cannot be used to find out which accounts exist.
   *
   * The password is verified even when there is no account, against a hash that cannot match, so a missing username does not answer faster than a wrong password.
   * Migration 0006 uses '!' for the same "never matches" purpose on the old bootstrap row, and verifyPassword returns false for it rather than throwing.
   */
  const hash = account?.passwordHash ?? '!';
  const ok = await verifyPassword(hash, input.password).catch(() => false);

  if (!account || !ok) {
    throw createError({ statusCode: 401, message: 'Wrong username or password' });
  }

  await setUserSession(event, { user: { id: account.id, username: account.username } });

  return toAccount(account);
});
