import type { CardRecord } from '#shared/types/card'

/**
 * A card's meaning, in the language the interface is in.
 *
 * English is what the card stores, because the bundled dictionary is a Chinese
 * to English one and there is no licensable Chinese to Vietnamese dictionary of
 * usable quality: the two measured are written up in docs/licences.md.
 *
 * So under the Vietnamese locale the English gloss is machine translated once,
 * cached on the server by word, and shown in its place. It is a translation of
 * a translation, which will occasionally drift from the Chinese, and it is
 * offered on that basis rather than as a dictionary entry.
 *
 * Everything about it is best effort. Signed out, no binding, an offline
 * browser, or a model that says nothing all leave the English standing, which
 * is a worse card but never a broken one.
 */

/** Module scope, so a word looked up on one card is done for every card. */
const cache = new Map<string, string>()
const inFlight = new Map<string, Promise<string | null>>()

export function useCardMeaning(card: Ref<CardRecord | null | undefined>) {
  const { locale } = useI18n()
  const { signedIn } = useSession()

  const translated = ref<string | null>(null)

  /** The English gloss until a translation arrives, then the translation. */
  const meaning = computed(() => translated.value ?? card.value?.translation ?? '')

  async function resolve() {
    const value = card.value
    translated.value = null

    if (!value?.translation || locale.value !== 'vi') {
      return
    }

    const key = `vi:${value.hanzi}`

    const cached = cache.get(key)
    if (cached) {
      translated.value = cached
      return
    }

    // The route spends an inference and writes a shared cache, so it is behind
    // a session. Signed out, the English gloss simply stands.
    if (!signedIn.value || import.meta.server) {
      return
    }

    let request = inFlight.get(key)

    if (!request) {
      request = $fetch<{ text: string | null }>('/api/words/translate', {
        query: { hanzi: value.hanzi, text: value.translation, locale: 'vi' }
      })
        .then(response => response.text)
        .catch(() => null)
        .finally(() => inFlight.delete(key))

      inFlight.set(key, request)
    }

    const text = await request

    if (text) {
      cache.set(key, text)
      // The card may have changed while this was in the air.
      if (card.value?.hanzi === value.hanzi && locale.value === 'vi') {
        translated.value = text
      }
    }
  }

  watch([card, locale, signedIn], resolve, { immediate: true })

  return { meaning }
}
