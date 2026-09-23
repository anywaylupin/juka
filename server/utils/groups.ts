import { and, eq, inArray, sql } from 'drizzle-orm';
import type { GroupRecord } from '#shared/types/card';
import { cardGroups, groups } from '../database/schema';
import type { JukaDatabase } from './db';

/**
 * Everything the card routes need to know about groups.
 *
 * Kept out of the handlers because three of them need the same two things: which groups a set of cards belongs to, and whether a group the caller named is actually theirs.
 */

/** One place that decides the wire shape of a group. */
export function toGroup(
  row: { id: number; name: string; color: string; orderIndex: number },
  count?: number
): GroupRecord {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    orderIndex: row.orderIndex,
    ...(count === undefined ? {} : { count })
  };
}

/**
 * Guards against a card being filed into someone else's group.
 *
 * Returns the ids that are genuinely the caller's.
 * Anything else is dropped rather than rejected: a stale group id from a client that has not refreshed should not fail an otherwise good card write.
 */
export async function ownedGroupIds(db: JukaDatabase, userId: number, wanted: number[]): Promise<number[]> {
  if (wanted.length === 0) {
    return [];
  }

  const rows = await inSlices(wanted, (slice) =>
    db
      .select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.userId, userId), inArray(groups.id, slice)))
  );

  return rows.map((row) => row.id);
}

/** cardId -> groupIds, for a page of cards. One query rather than one per card. */
export async function groupsForCards(db: JukaDatabase, cardIds: number[]): Promise<Map<number, number[]>> {
  const byCard = new Map<number, number[]>();

  if (cardIds.length === 0) {
    return byCard;
  }

  const rows = await inSlices(cardIds, (slice) =>
    db
      .select({ cardId: cardGroups.cardId, groupId: cardGroups.groupId })
      .from(cardGroups)
      .where(inArray(cardGroups.cardId, slice))
  );

  for (const row of rows) {
    const existing = byCard.get(row.cardId);
    if (existing) {
      existing.push(row.groupId);
    } else {
      byCard.set(row.cardId, [row.groupId]);
    }
  }

  return byCard;
}

/**
 * Replaces a card's group membership with exactly the ids given.
 *
 * Delete then insert rather than diffing: the set is small enough that working out the difference costs more than redoing it, and doing it this way means there is one code path instead of three.
 */
export async function setCardGroups(
  db: JukaDatabase,
  userId: number,
  cardId: number,
  wanted: number[]
): Promise<number[]> {
  const owned = await ownedGroupIds(db, userId, wanted);

  await db.delete(cardGroups).where(eq(cardGroups.cardId, cardId));

  if (owned.length > 0) {
    await db.insert(cardGroups).values(owned.map((groupId) => ({ cardId, groupId })));
  }

  return owned;
}

/** Groups with how many cards are in each, for the filter and the chart. */
export async function listGroups(db: JukaDatabase, userId: number): Promise<GroupRecord[]> {
  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      color: groups.color,
      orderIndex: groups.orderIndex,
      count: sql<number>`count(${cardGroups.cardId})`
    })
    .from(groups)
    .leftJoin(cardGroups, eq(cardGroups.groupId, groups.id))
    .where(eq(groups.userId, userId))
    .groupBy(groups.id)
    .orderBy(groups.orderIndex, groups.id);

  return rows.map((row) => toGroup(row, Number(row.count)));
}
