import type { CardListResponse, CardRecord } from '#shared/types/card'
import type { CardCreateInput, CardUpdateInput } from '#shared/schemas/card'
import { clampRating } from '#shared/constants/rating'

/**
 * Every card in the box, wherever the box happens to be.
 *
 * Signed out, the box is local storage. Signed in, it is the account. The rest
 * of the app asks this composable and never finds out which, so there is one
 * code path for a card list instead of two that drift apart.
 *
 * The whole collection is held in memory in both modes. A personal vocabulary
 * is thousands of short rows at most, and holding it makes the card box scrub
 * instantly, filter without a round trip, and keep working offline. The account
 * mode still reads through the keyset paginated route, one page after another,
 * so the server never pays for an OFFSET.
 */

const STORAGE_KEY = 'juka.cards'
const STORAGE_SEQUENCE = 'juka.cards.seq'
const PAGE_SIZE = 200

export type StoreMode = 'local' | 'account'

function readLocal(): CardRecord[] {
  if (import.meta.server) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    /*
     * Normalised, never cast. Local storage has no migrations, so whatever an
     * older release wrote is still here: cards from before groups existed have
     * no groupIds, and every caller that reached for it crashed the page.
     * Repairing on read is the only migration this store gets.
     */
    return normaliseCards(raw ? JSON.parse(raw) : [])
  }
  catch {
    // Private mode, cleared storage, or something else wrote nonsense here.
    // An unreadable box is an empty one, never a crash.
    return []
  }
}

function writeLocal(cards: CardRecord[]) {
  if (import.meta.server) {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  }
  catch {
    // Quota or a blocked store. The in-memory copy is still correct for this
    // session, so the interface keeps working and only persistence is lost.
  }
}

/** Local ids are negative, so they can never collide with an account's ids. */
function nextLocalId(): number {
  if (import.meta.server) {
    return -1
  }

  const current = Number(window.localStorage.getItem(STORAGE_SEQUENCE) ?? '0')
  const next = (Number.isFinite(current) ? current : 0) + 1

  try {
    window.localStorage.setItem(STORAGE_SEQUENCE, String(next))
  }
  catch { /* see writeLocal */ }

  return -next
}

export function useCardStore() {
  const { account, signedIn } = useSession()

  const cards = useState<CardRecord[]>('juka:cards', () => [])
  const loading = useState('juka:cards-loading', () => false)
  const failed = useState('juka:cards-failed', () => false)
  /** Null until the first load finishes, so the empty state cannot flash. */
  const loaded = useState('juka:cards-loaded', () => false)

  const mode = computed<StoreMode>(() => (signedIn.value ? 'account' : 'local'))

  /** Local cards that exist right now, whether or not they are the live box. */
  function localCards(): CardRecord[] {
    return readLocal()
  }

  async function load() {
    loading.value = true
    failed.value = false

    try {
      if (!signedIn.value) {
        cards.value = readLocal()
        return
      }

      // Walk every page of the keyset route rather than asking for an offset.
      const collected: CardRecord[] = []
      let cursor: number | null = null

      do {
        const page: CardListResponse = await $fetch<CardListResponse>('/api/cards', {
          query: { limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) }
        })
        collected.push(...page.items)
        cursor = page.hasMore ? page.nextCursor : null
      } while (cursor !== null)

      cards.value = collected
    }
    catch {
      /*
       * A list that failed to load is not an empty list. The interface reads
       * this flag and says so, rather than rendering the empty box and letting
       * someone think their cards are gone.
       */
      failed.value = true
      cards.value = []
    }
    finally {
      loading.value = false
      loaded.value = true
    }
  }

  // Signing in or out swaps which box is live, so the list is re-read.
  watch(() => account.value?.id ?? null, () => {
    if (import.meta.client) {
      load()
    }
  })

  /** The word is already filed. Checked before every write, in both modes. */
  function findByHanzi(hanzi: string): CardRecord | undefined {
    const wanted = hanzi.trim()
    return cards.value.find(card => card.hanzi === wanted)
  }

  async function add(input: CardCreateInput): Promise<CardRecord> {
    const hanzi = input.hanzi.trim()
    const clash = findByHanzi(hanzi)

    if (clash) {
      throw createError({
        statusCode: 409,
        data: { cardId: clash.id },
        message: `${hanzi} is already in your box`
      })
    }

    if (signedIn.value) {
      const created = await $fetch<CardRecord>('/api/cards', { method: 'POST', body: input })
      cards.value = [created, ...cards.value]
      return created
    }

    const now = new Date().toISOString()
    const created: CardRecord = {
      id: nextLocalId(),
      hanzi,
      pinyin: input.pinyin?.trim() ?? '',
      pinyinPlain: tonelessPinyin(input.pinyin ?? ''),
      hanViet: input.hanViet ?? null,
      translation: input.translation ?? '',
      translationVi: input.translationVi ?? null,
      pos: input.pos ?? null,
      rating: clampRating(input.rating ?? 0),
      syllables: countSyllables(hanzi),
      notes: input.notes ?? null,
      groupIds: input.groupIds ?? [],
      createdAt: now,
      updatedAt: now
    }

    cards.value = [created, ...cards.value]
    writeLocal(cards.value)

    return created
  }

  async function update(id: number, changes: CardUpdateInput): Promise<CardRecord> {
    if (changes.hanzi) {
      const clash = findByHanzi(changes.hanzi)
      if (clash && clash.id !== id) {
        throw createError({
          statusCode: 409,
          data: { cardId: clash.id },
          message: `${changes.hanzi} is already in your box`
        })
      }
    }

    if (signedIn.value) {
      const saved = await $fetch<CardRecord>(`/api/cards/${id}`, { method: 'PATCH', body: changes })
      cards.value = cards.value.map(card => (card.id === id ? saved : card))
      return saved
    }

    const existing = cards.value.find(card => card.id === id)
    if (!existing) {
      throw createError({ statusCode: 404, message: 'Card not found' })
    }

    const saved: CardRecord = {
      ...existing,
      ...(changes.hanzi !== undefined && { hanzi: changes.hanzi, syllables: countSyllables(changes.hanzi) }),
      // The search column is derived, so it moves whenever the reading does.
      ...(changes.pinyin !== undefined && { pinyin: changes.pinyin, pinyinPlain: tonelessPinyin(changes.pinyin) }),
      ...(changes.hanViet !== undefined && { hanViet: changes.hanViet ?? null }),
      ...(changes.translation !== undefined && { translation: changes.translation }),
      ...(changes.translationVi !== undefined && { translationVi: changes.translationVi ?? null }),
      ...(changes.pos !== undefined && { pos: changes.pos ?? null }),
      ...(changes.rating !== undefined && { rating: clampRating(changes.rating) }),
      ...(changes.notes !== undefined && { notes: changes.notes ?? null }),
      ...(changes.groupIds !== undefined && { groupIds: changes.groupIds }),
      updatedAt: new Date().toISOString()
    }

    cards.value = cards.value.map(card => (card.id === id ? saved : card))
    writeLocal(cards.value)

    return saved
  }

  async function remove(id: number): Promise<void> {
    if (signedIn.value) {
      await $fetch(`/api/cards/${id}`, { method: 'DELETE' })
      cards.value = cards.value.filter(card => card.id !== id)
      return
    }

    cards.value = cards.value.filter(card => card.id !== id)
    writeLocal(cards.value)
  }

  /** Puts a deleted card back, for the undo that follows a swipe to the bin. */
  async function restore(card: CardRecord): Promise<void> {
    if (signedIn.value) {
      const recreated = await $fetch<CardRecord>('/api/cards', {
        method: 'POST',
        body: {
          hanzi: card.hanzi,
          pinyin: card.pinyin,
          hanViet: card.hanViet,
          translation: card.translation,
          translationVi: card.translationVi,
          pos: card.pos,
          rating: card.rating,
          notes: card.notes,
          groupIds: card.groupIds
        }
      })
      cards.value = [recreated, ...cards.value]
      return
    }

    cards.value = [card, ...cards.value]
    writeLocal(cards.value)
  }

  /**
   * Strips a deleted group's id off every card in the local box.
   *
   * The account path does not need this: the join table cascades on delete. A
   * local box has no foreign keys, so the cleanup is explicit.
   */
  async function dropGroup(groupId: number): Promise<void> {
    cards.value = cards.value.map(card => (
      card.groupIds.includes(groupId)
        ? { ...card, groupIds: card.groupIds.filter(id => id !== groupId) }
        : card
    ))
    writeLocal(cards.value)
  }

  return {
    cards,
    mode,
    loading,
    loaded,
    failed,
    load,
    localCards,
    findByHanzi,
    add,
    update,
    remove,
    restore,
    dropGroup
  }
}
