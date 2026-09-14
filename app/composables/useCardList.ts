import type { CardListResponse, CardRecord, CardStatus } from '#shared/types/card'

export interface CardFilters {
  q: string
  unitId?: number
  status?: CardStatus
  hskLevel?: number
  syllables?: number
}

const PAGE_SIZE = 40

/**
 * Card list with keyset pagination.
 *
 * The first page comes from useFetch so it renders on the server. Later pages
 * are appended with $fetch from the load handler, which is the only place a
 * bare $fetch belongs.
 */
export async function useCardList() {
  const filters = useState<CardFilters>('juka:card-filters', () => ({ q: '' }))

  const query = computed(() => ({
    limit: PAGE_SIZE,
    ...(filters.value.q.trim() ? { q: filters.value.q.trim() } : {}),
    ...(filters.value.unitId !== undefined ? { unitId: filters.value.unitId } : {}),
    ...(filters.value.status !== undefined ? { status: filters.value.status } : {}),
    ...(filters.value.hskLevel !== undefined ? { hskLevel: filters.value.hskLevel } : {}),
    ...(filters.value.syllables !== undefined ? { syllables: filters.value.syllables } : {})
  }))

  const { data, status, error, refresh } = await useFetch<CardListResponse>('/api/cards', {
    // A reactive query is watched by default, so a filter change refetches
    // the first page on its own.
    query
  })

  /** Pages beyond the first, appended as the user scrolls. */
  const appended = ref<CardRecord[]>([])
  const appendedCursor = ref<number | null>(null)
  const appendedHasMore = ref<boolean | null>(null)
  const loadingMore = ref(false)

  // A filter change invalidates everything already appended.
  watch(query, () => {
    appended.value = []
    appendedCursor.value = null
    appendedHasMore.value = null
  })

  const items = computed<CardRecord[]>(() => [
    ...(data.value?.items ?? []),
    ...appended.value
  ])

  const cursor = computed(() => appendedCursor.value ?? data.value?.nextCursor ?? null)
  const hasMore = computed(() => appendedHasMore.value ?? data.value?.hasMore ?? false)

  async function loadMore() {
    if (!hasMore.value || loadingMore.value || cursor.value === null) {
      return
    }

    loadingMore.value = true
    try {
      const page = await $fetch<CardListResponse>('/api/cards', {
        query: { ...query.value, cursor: cursor.value }
      })
      appended.value = [...appended.value, ...page.items]
      appendedCursor.value = page.nextCursor
      appendedHasMore.value = page.hasMore
    }
    finally {
      loadingMore.value = false
    }
  }

  /** Called after a create, edit, or delete so the list reflects the change. */
  async function reload() {
    appended.value = []
    appendedCursor.value = null
    appendedHasMore.value = null
    await refresh()
  }

  function clearFilters() {
    filters.value = { q: '' }
  }

  const hasActiveFilters = computed(() =>
    Boolean(filters.value.q.trim())
    || filters.value.unitId !== undefined
    || filters.value.status !== undefined
    || filters.value.hskLevel !== undefined
    || filters.value.syllables !== undefined
  )

  return {
    filters,
    items,
    status,
    error,
    hasMore,
    loadingMore,
    loadMore,
    reload,
    clearFilters,
    hasActiveFilters
  }
}
