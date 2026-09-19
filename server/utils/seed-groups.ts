import { count, eq } from 'drizzle-orm';
import type { H3Event } from 'h3';
import { DEFAULT_GROUPS } from '#shared/constants/groups';
import { groups } from '../database/schema';

/**
 * Give a new account the example HSK groups.
 *
 * Only ever on an empty box, so this can be called from anywhere that makes an account without having to know whether another path already did it: a registration, a first GitHub sign-in, or a merge that created the account on the way in.
 * A failure here is not worth failing a sign-up over. The groups are an example; the account is the thing the person asked for.
 */
export async function seedDefaultGroups(event: H3Event, userId: number): Promise<void> {
  try {
    const db = useDrizzle(event);
    const [existing] = await db
      .select({ total: count(groups.id) })
      .from(groups)
      .where(eq(groups.userId, userId));

    if ((existing?.total ?? 0) > 0) {
      return;
    }

    await db.insert(groups).values(
      DEFAULT_GROUPS.map((group, index) => ({
        userId,
        name: group.name,
        colour: group.colour,
        orderIndex: index
      }))
    );
  } catch (error) {
    console.error('[juka] could not seed the example groups', error);
  }
}
