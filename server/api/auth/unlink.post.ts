import { and, eq } from 'drizzle-orm';
import { unlinkProviderSchema } from '#shared/schemas/auth';
import type { AccountRecord } from '#shared/types/auth';
import { oauthAccounts, users } from '../../database/schema';

/**
 * Disconnect a provider from an account.
 *
 * Refused when it is the last way in: an account with no password and no other provider would be unreachable the moment this succeeded, and "you are now locked out" is not an outcome a settings toggle is allowed to have.
 */
export default defineEventHandler(async (event): Promise<AccountRecord> => {
  const input = await readValidatedBody(event, unlinkProviderSchema.parse);
  const userId = await requireUserId(event);
  const db = useDrizzle(event);

  const [account] = await db.select().from(users).where(eq(users.id, userId));

  if (!account) {
    throw createError({ statusCode: 404, message: 'Account not found' });
  }

  const linked = await providersFor(event, userId);

  if (!linked.includes(input.provider as (typeof linked)[number])) {
    return toAccount(account, linked);
  }

  if (!account.passwordHash && linked.length === 1) {
    throw createError({
      statusCode: 409,
      message: 'Set a password first, or this account would have no way to sign in.'
    });
  }

  await db
    .delete(oauthAccounts)
    .where(and(eq(oauthAccounts.userId, userId), eq(oauthAccounts.provider, input.provider)));

  return toAccount(account, await providersFor(event, userId));
});
