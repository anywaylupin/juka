import { and, eq, ne } from 'drizzle-orm';
import { groupIdSchema, groupUpdateSchema } from '#shared/schemas/group';
import type { GroupRecord } from '#shared/types/card';
import { groups } from '../../database/schema';

export default defineEventHandler(async (event): Promise<GroupRecord> => {
  const { id } = await getValidatedRouterParams(event, groupIdSchema.parse);
  const input = await readValidatedBody(event, groupUpdateSchema.parse);
  const userId = await requireUserId(event);
  const db = useDrizzle(event);

  if (input.name) {
    const [clash] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.userId, userId), eq(groups.name, input.name), ne(groups.id, id)));

    if (clash) {
      throw createError({ statusCode: 409, message: `You already have a group called ${input.name}` });
    }
  }

  const [updated] = await db
    .update(groups)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.orderIndex !== undefined && { orderIndex: input.orderIndex })
    })
    .where(and(eq(groups.id, id), eq(groups.userId, userId)))
    .returning();

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Group not found' });
  }

  return toGroup(updated);
});
