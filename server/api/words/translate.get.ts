import { translateQuerySchema } from '#shared/schemas/word'

/**
 * The Vietnamese wording of a card's meaning.
 *
 * Read only from the caller's point of view; the cache write inside
 * translateGloss is an implementation detail, which is why this is a GET.
 *
 * `text: null` is a normal answer, not an error. It means the binding is absent
 * or the model had nothing, and the interface leaves the English in place.
 */
export default defineEventHandler(async (event): Promise<{ text: string | null }> => {
  const { hanzi, text, locale } = await getValidatedQuery(event, translateQuerySchema.parse)

  // Signed in only: this writes to a shared cache and spends an inference.
  await requireUserId(event)

  return { text: await translateGloss(event, hanzi, text, locale) }
})
