import { loginSchema } from '#shared/schemas/auth';
import type { AccountRecord } from '#shared/types/auth';

export default defineEventHandler(async (event): Promise<AccountRecord> => {
  const input = await readValidatedBody(event, loginSchema.parse);

  const account = await findAccountByIdentifier(event, input.identifier);

  /*
   * One message for an unknown account, a wrong password, and an account that has no password at all, so the form cannot be used to find out which accounts exist or how they sign in.
   *
   * The password is verified even when there is nothing to verify it against, using a hash that cannot match, so a missing account does not answer faster than a wrong password.
   */
  const hash = account?.passwordHash ?? '!';
  const ok = await verifyPassword(hash, input.password).catch(() => false);

  if (!account || !account.passwordHash || !ok) {
    throw createError({ statusCode: 401, message: 'Wrong username or password' });
  }

  await setUserSession(event, { user: { id: account.id, username: account.username } });

  return toAccount(account, await providersFor(event, account.id));
});
