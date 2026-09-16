import { and, eq } from 'drizzle-orm';
import { cardIdSchema, cardUpdateSchema } from '#shared/schemas/card';
import type { CardRecord } from '#shared/types/card';
import { cards } from '../../database/schema';

export default defineEventHandler(async (event): Promise<CardRecord> => {
  const { id } = await getValidatedRouterParams(event, cardIdSchema.parse);
  const input = await readValidatedBody(event, cardUpdateSchema.parse);
  const userId = await requireUserId(event);
  const db = useDrizzle(event);

  const [existing] = await db
    .select()
    .from(cards)
    .where(and(eq(cards.id, id), eq(cards.userId, userId)));

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Card not found' });
  }

  const hanzi = input.hanzi ?? existing.hanzi;
  const suppliedPinyin = input.pinyin ?? (input.hanzi ? undefined : existing.pinyin);

  // Re-derive whenever the hanzi or the pinyin moved, so the search columns cannot drift from what the card says.
  const derived =
    input.hanzi !== undefined || input.pinyin !== undefined ? deriveCardFields(hanzi, suppliedPinyin) : {};

  /*
   * A rewritten hanzi must not collide with another card.
   * Same reasoning as on create: a sentence rather than a constraint violation, with the unique index underneath as the real guarantee.
   */
  if (input.hanzi !== undefined && input.hanzi !== existing.hanzi) {
    const [duplicate] = await db
      .select({ id: cards.id })
      .from(cards)
      .where(and(eq(cards.userId, userId), eq(cards.hanzi, input.hanzi)));

    if (duplicate) {
      throw createError({
        statusCode: 409,
        data: { cardId: duplicate.id },
        message: `${input.hanzi} is already in your box`
      });
    }
  }

  const [updated] = await db
    .update(cards)
    .set({
      ...(input.hanzi !== undefined && { hanzi: input.hanzi }),
      ...(input.hanViet !== undefined && { hanViet: input.hanViet }),
      ...(input.translation !== undefined && { translation: input.translation }),
      ...(input.translationVi !== undefined && { translationVi: input.translationVi }),
      ...(input.pos !== undefined && { pos: input.pos }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...derived,
      updatedAt: new Date()
    })
    .where(and(eq(cards.id, id), eq(cards.userId, userId)))
    .returning();

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Card not found' });
  }

  /*
   * Absent means leave the groups alone, which is not the same as an empty array meaning take it out of all of them.
   * Both are reachable, so both are distinguished here rather than collapsed.
   */
  const groupIds =
    input.groupIds !== undefined
      ? await setCardGroups(db, userId, updated.id, input.groupIds)
      : ((await groupsForCards(db, [updated.id])).get(updated.id) ?? []);

  return toCardRecord(updated, groupIds);
});
