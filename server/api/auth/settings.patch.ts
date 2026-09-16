import { eq } from 'drizzle-orm';
import { settingsUpdateSchema } from '#shared/schemas/settings';
import type { AccountRecord } from '#shared/types/auth';
import { users } from '../../database/schema';

/**
 * The parts of an account that are preferences rather than identity.
 *
 * Only the rating names so far.
 * Kept apart from profile.patch, which handles the email and the password and asks for the current password before changing one; renaming a rating should not need that ceremony.
 */
export default defineEventHandler(async (event): Promise<AccountRecord> => {
  const input = await readValidatedBody(event, settingsUpdateSchema.parse);
  const userId = await requireUserId(event);
  const db = useDrizzle(event);

  const [updated] = await db
    .update(users)
    .set({
      // Null clears the customisation and restores the defaults, which is what a reset button sends.
      ...(input.ratingLabels !== undefined && {
        ratingLabels: input.ratingLabels === null ? null : JSON.stringify(input.ratingLabels)
      })
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Account not found' });
  }

  return toAccount(updated);
});
