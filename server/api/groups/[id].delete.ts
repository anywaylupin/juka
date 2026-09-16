import { and, eq } from 'drizzle-orm';
import { groupIdSchema } from '#shared/schemas/group';
import { groups } from '../../database/schema';

/**
 * Deleting a group does not delete its cards.
 *
 * The foreign key on card_groups cascades, so the cards simply stop being in
 * it. That is the difference between a group and the units this replaced: a
 * group is a label, so removing it removes a label and nothing else.
 */
export default defineEventHandler(async (event): Promise<{ deleted: number }> => {
  const { id } = await getValidatedRouterParams(event, groupIdSchema.parse);
  const userId = await requireUserId(event);
  const db = useDrizzle(event);

  const deleted = await db
    .delete(groups)
    .where(and(eq(groups.id, id), eq(groups.userId, userId)))
    .returning({ id: groups.id });

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, message: 'Group not found' });
  }

  return { deleted: deleted.length };
});
