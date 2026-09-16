import { and, eq } from 'drizzle-orm';
import { cardIdSchema } from '#shared/schemas/card';
import type { CardRecord } from '#shared/types/card';
import { cards } from '../../database/schema';

export default defineEventHandler(async (event): Promise<CardRecord> => {
  const { id } = await getValidatedRouterParams(event, cardIdSchema.parse);
  const userId = await requireUserId(event);
  const db = useDrizzle(event);

  const [row] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)));

  if (!row) {
    throw createError({ statusCode: 404, message: 'Card not found' });
  }

  const byCard = await groupsForCards(db, [row.id]);

  return toCardRecord(row, byCard.get(row.id) ?? []);
});
