import { and, eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { translations } from '../database/schema'

/**
 * A card's meaning in Vietnamese.
 *
 * This exists because there is no licensable Chinese to Vietnamese dictionary
 * of usable quality. The two that were measured are written up in
 * docs/licences.md: one covers 8.4% of common words and glosses 癌 "cancer" as
 * squirrel monkey, the other has no licence at all. So the English gloss is
 * machine translated instead, which is honest about what it is.
 *
 * Cached by hanzi and locale rather than by card, so the same word costs one
 * inference across the whole app however many people file it.
 *
 * Best effort throughout. No binding, a timeout, or an empty reply all leave
 * the English meaning standing, which is a worse card but never a broken one.
 */

/** Small and fast. This is a short gloss, not prose. */
export const TRANSLATION_MODEL = '@cf/meta/m2m100-1.2b'

const MAX_SOURCE = 500

export async function translateGloss(
  event: H3Event,
  hanzi: string,
  text: string,
  locale: 'vi'
): Promise<string | null> {
  const source = text.trim()

  if (!source || source.length > MAX_SOURCE) {
    return null
  }

  const db = useDrizzle(event)

  const [cached] = await db
    .select()
    .from(translations)
    .where(and(eq(translations.hanzi, hanzi), eq(translations.locale, locale)))

  // A row from an older model is a miss, so a model change re-asks rather than
  // serving output the current one would not have produced.
  if (cached && cached.model === TRANSLATION_MODEL) {
    return cached.text
  }

  const ai = tryWorkersAi(event)
  if (!ai) {
    return null
  }

  let translated: string | null

  try {
    const response = await ai.run(TRANSLATION_MODEL, {
      text: source,
      source_lang: 'english',
      target_lang: 'vietnamese'
    })

    const value = (response as { translated_text?: string }).translated_text
    translated = typeof value === 'string' ? value.trim() : null
  }
  catch {
    // A cold binding, a rate limit, or a model timeout. English stands.
    return null
  }

  if (!translated) {
    return null
  }

  try {
    await db
      .insert(translations)
      .values({ hanzi, locale, text: translated, model: TRANSLATION_MODEL })
      .onConflictDoUpdate({
        target: [translations.hanzi, translations.locale],
        set: { text: translated, model: TRANSLATION_MODEL }
      })
  }
  catch {
    // A cache that will not write is still a working translation.
  }

  return translated
}
