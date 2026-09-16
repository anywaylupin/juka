import type { GroupRecord } from '#shared/types/card';

/** A user's groups, each with how many cards are filed under it. */
export default defineEventHandler(async (event): Promise<{ items: GroupRecord[] }> => {
  const userId = await requireUserId(event);
  const db = useDrizzle(event);

  return { items: await listGroups(db, userId) };
});
