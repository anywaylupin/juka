import { and, eq } from 'drizzle-orm';
import { cardIdSchema } from '#shared/schemas/card';
import { cards } from '../../database/schema';

export default defineEventHandler(async (event): Promise<{ deleted: number }> => {
  const { id } = await getValidatedRouterParams(event, cardIdSchema.parse);
  const userId = await requireUserId(event);
  const db = useDrizzle(event);

  const deleted = await db
    .delete(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .returning({ id: cards.id });

  if (deleted.length === 0) {
    throw createError({ statusCode: 404, message: 'Card not found' });
  }

  return { deleted: deleted.length };
});
