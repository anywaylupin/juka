import { and, eq, ne } from 'drizzle-orm';
import { profileUpdateSchema } from '#shared/schemas/auth';
import type { AccountRecord } from '#shared/types/auth';
import { users } from '../../database/schema';

/**
 * Everything on an account is changeable here, one field or all of them: the username, the address, the password.
 *
 * Changing a password needs the current one, even though the session already proves who this is, because a session can be a borrowed laptop and this is the one action that locks the real owner out of their own account.
 * An account that signs in through a provider has no current password, so setting the first one asks for nothing: the provider already proved who they are, and there is nothing to lock them out of.
 */
export default defineEventHandler(async (event): Promise<AccountRecord> => {
  const input = await readValidatedBody(event, profileUpdateSchema.parse);
  const userId = await requireUserId(event);
  const db = useDrizzle(event);

  const [account] = await db.select().from(users).where(eq(users.id, userId));

  if (!account) {
    throw createError({ statusCode: 404, message: 'Account not found' });
  }

  const changes: { username?: string; email?: string | null; passwordHash?: string } = {};

  if (input.username && input.username !== account.username) {
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.username, input.username), ne(users.id, userId)));

    if (taken) {
      throw createError({ statusCode: 409, message: 'That username is taken' });
    }

    changes.username = input.username;
  }

  if (input.email !== undefined && input.email !== account.email) {
    if (input.email) {
      const [claimed] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, input.email), ne(users.id, userId)));

      if (claimed) {
        throw createError({ statusCode: 409, message: 'That email is already on another account' });
      }
    }

    changes.email = input.email;
  }

  if (input.password) {
    if (account.passwordHash) {
      const ok = await verifyPassword(account.passwordHash, input.currentPassword ?? '').catch(() => false);

      if (!ok) {
        throw createError({ statusCode: 403, message: 'Current password is wrong' });
      }
    }

    changes.passwordHash = await hashPassword(input.password);
  }

  const providers = await providersFor(event, userId);

  if (Object.keys(changes).length === 0) {
    return toAccount(account, providers);
  }

  const [updated] = await db.update(users).set(changes).where(eq(users.id, userId)).returning();

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Account not found' });
  }

  // The session carries the username, so a rename that does not reach it leaves the greeting stale until the next sign-in.
  if (changes.username) {
    await setUserSession(event, { user: { id: updated.id, username: updated.username } });
  }

  return toAccount(updated, providers);
});
