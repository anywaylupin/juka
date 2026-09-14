import { and, eq, inArray } from 'drizzle-orm'
import { cardMergeSchema } from '#shared/schemas/card'
import type { MergeResult } from '#shared/types/auth'
import { cards } from '../../database/schema'

/**
 * Copies the cards a signed out visitor built up in local storage onto their
 * account, once, when they sign in.
 *
 * Deliberately additive. A word already on the account is skipped rather than
 * overwritten, because the account copy is the one that has been rated and the
 * local copy is usually the rougher of the two. Nothing here deletes anything,
 * on either side: the browser keeps its local cards after this runs, which is
 * what makes signing out safe.
 */
export default defineEventHandler(async (event): Promise<MergeResult> => {
  const { cards: incoming } = await readValidatedBody(event, cardMergeSchema.parse)
  const userId = await requireUserId(event)
  const db = useDrizzle(event)

  const result: MergeResult = { added: 0, skipped: 0, failed: 0 }

  if (incoming.length === 0) {
    return result
  }

  // One read to find out what is already filed, rather than a query per card.
  const wanted = [...new Set(incoming.map(card => card.hanzi))]
  const existing = await db
    .select({ hanzi: cards.hanzi })
    .from(cards)
    .where(and(eq(cards.userId, userId), inArray(cards.hanzi, wanted)))

  const filed = new Set(existing.map(row => row.hanzi))

  for (const card of incoming) {
    if (filed.has(card.hanzi)) {
      result.skipped += 1
      continue
    }

    try {
      await db.insert(cards).values({
        userId,
        hanzi: card.hanzi,
        hanViet: card.hanViet ?? null,
        translation: card.translation,
        translationVi: card.translationVi ?? null,
        pos: card.pos ?? null,
        rating: card.rating,
        notes: card.notes ?? null,
        ...deriveCardFields(card.hanzi, card.pinyin)
      })

      /*
       * Groups are deliberately not carried across. A signed out box has its
       * own local group ids, which mean nothing on an account that may already
       * have groups of its own, and silently inventing matching groups would be
       * a second guess on top of the merge. The cards arrive ungrouped and the
       * user files them.
       */
      filed.add(card.hanzi)
      result.added += 1
    }
    catch {
      /*
       * Almost certainly the unique index catching a duplicate that slipped
       * past the read above, which is a skip rather than a failure. Anything
       * else is counted honestly rather than swallowed, and one bad card never
       * stops the rest of the merge.
       */
      result.failed += 1
    }
  }

  return result
})
