import { and, count, eq } from 'drizzle-orm';
import { groupCreateSchema } from '#shared/schemas/group';
import type { GroupRecord } from '#shared/types/card';
import { groups } from '../../database/schema';

export default defineEventHandler(async (event): Promise<GroupRecord> => {
  const input = await readValidatedBody(event, groupCreateSchema.parse);
  const userId = await requireUserId(event);
  const db = useDrizzle(event);

  const [clash] = await db
    .select({ id: groups.id })
    .from(groups)
    .where(and(eq(groups.userId, userId), eq(groups.name, input.name)));

  if (clash) {
    throw createError({ statusCode: 409, message: `You already have a group called ${input.name}` });
  }

  // New groups land at the end unless the caller placed them.
  const [existing] = await db
    .select({ total: count(groups.id) })
    .from(groups)
    .where(eq(groups.userId, userId));

  const [created] = await db
    .insert(groups)
    .values({
      userId,
      name: input.name,
      colour: input.colour,
      orderIndex: input.orderIndex ?? existing?.total ?? 0
    })
    .returning();

  if (!created) {
    throw createError({ statusCode: 500, message: 'Group was not created' });
  }

  setResponseStatus(event, 201);

  return toGroup(created, 0);
});
