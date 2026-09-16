import { and, eq } from 'drizzle-orm';
import { cardCreateSchema } from '#shared/schemas/card';
import type { CardRecord } from '#shared/types/card';
import { cards } from '../../database/schema';

export default defineEventHandler(async (event): Promise<CardRecord> => {
  const input = await readValidatedBody(event, cardCreateSchema.parse);
  const userId = await requireUserId(event);
  const db = useDrizzle(event);

  /*
   * One card per word. Checked here so the user gets a sentence instead of a
   * constraint violation, and enforced by the unique index underneath so two
   * simultaneous writes cannot both win.
   */
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

  const [created] = await db
    .insert(cards)
    .values({
      userId,
      hanzi: input.hanzi,
      hanViet: input.hanViet ?? null,
      translation: input.translation,
      translationVi: input.translationVi ?? null,
      pos: input.pos ?? null,
      rating: input.rating,
      notes: input.notes ?? null,
      ...deriveCardFields(input.hanzi, input.pinyin)
    })
    .returning();

  if (!created) {
    throw createError({ statusCode: 500, message: 'Card was not created' });
  }

  const groupIds = input.groupIds ? await setCardGroups(db, userId, created.id, input.groupIds) : [];

  setResponseStatus(event, 201);

  return toCardRecord(created, groupIds);
});
