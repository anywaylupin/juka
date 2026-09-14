import { z } from 'zod'

/**
 * Asking for a card's meaning in another language.
 *
 * The hanzi is sent as well as the English text because the cache is keyed by
 * word: two cards for the same word should not each pay for a translation.
 */
export const translateQuerySchema = z.object({
  hanzi: z.string().trim().min(1).max(32),
  text: z.string().trim().min(1).max(500),
  /** Only Vietnamese for now, but the cache and the route are locale keyed. */
  locale: z.enum(['vi'])
})

export type TranslateQuery = z.infer<typeof translateQuerySchema>
