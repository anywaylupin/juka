import { eq } from 'drizzle-orm';
import { profileUpdateSchema } from '#shared/schemas/auth';
import type { AccountRecord } from '#shared/types/auth';
import { users } from '../../database/schema';

/** Account settings: the optional email, and changing the password. */
export default defineEventHandler(async (event): Promise<AccountRecord> => {
  const input = await readValidatedBody(event, profileUpdateSchema.parse);
  const userId = await requireUserId(event);
  const db = useDrizzle(event);

  const [account] = await db.select().from(users).where(eq(users.id, userId));

  if (!account) {
    throw createError({ statusCode: 404, message: 'Account not found' });
  }

  const changes: { email?: string | null; passwordHash?: string } = {};

  if (input.email !== undefined) {
    changes.email = input.email;
  }

  if (input.password) {
    /*
     * Changing a password needs the current one, even though the session already proves who this is.
     * A session can be a borrowed laptop, and this is the one action that would lock the real owner out of their own account.
     */
    const ok = await verifyPassword(account.passwordHash, input.currentPassword ?? '').catch(() => false);

    if (!ok) {
      throw createError({ statusCode: 403, message: 'Current password is wrong' });
    }

    changes.passwordHash = await hashPassword(input.password);
  }

  if (Object.keys(changes).length === 0) {
    return toAccount(account);
  }

  const [updated] = await db.update(users).set(changes).where(eq(users.id, userId)).returning();

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Account not found' });
  }

  return toAccount(updated);
});
