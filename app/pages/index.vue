<script setup lang="ts">
import { CARD_STATUS_LIST } from '#shared/constants/card-status'
import type { CardRecord, CardStatus, UnitListResponse } from '#shared/types/card'

definePageMeta({ name: 'cards' })

const { t } = useI18n()
const localePath = useLocalePath()

useSeoMeta({
  title: 'Juka',
  description: 'Flashcard storage for HSK learners'
})

const {
  filters,
  items,
  status,
  hasMore,
  loadingMore,
  loadMore,
  reload,
  clearFilters,
  hasActiveFilters
} = await useCardList()

const { data: unitsData, refresh: refreshUnits } = await useFetch<UnitListResponse>('/api/units')
const units = computed(() => unitsData.value?.items ?? [])

/* Search box, debounced so a request does not fire per keystroke. */
const searchInput = ref(filters.value.q)
let debounceTimer: ReturnType<typeof setTimeout> | undefined

watch(searchInput, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    filters.value = { ...filters.value, q: value }
  }, 250)
})

watch(() => filters.value.q, (value) => {
  if (value !== searchInput.value) {
    searchInput.value = value
  }
})

onBeforeUnmount(() => clearTimeout(debounceTimer))

function toggleStatus(value: CardStatus) {
  filters.value = {
    ...filters.value,
    status: filters.value.status === value ? undefined : value
  }
}

function toggleUnit(value: number) {
  filters.value = {
    ...filters.value,
    unitId: filters.value.unitId === value ? undefined : value
  }
}

function toggleSyllables(value: number) {
  filters.value = {
    ...filters.value,
    syllables: filters.value.syllables === value ? undefined : value
  }
}

/* Infinite scroll. The button below stays as the accessible fallback. */
const sentinel = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!sentinel.value || typeof IntersectionObserver === 'undefined') {
    return
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting)) {
      loadMore()
    }
  }, { rootMargin: '400px' })

  observer.observe(sentinel.value)
  onBeforeUnmount(() => observer.disconnect())
})

/* Add card */
const addOpen = ref(false)

async function onSaved(card: CardRecord) {
  addOpen.value = false
  await Promise.all([reload(), refreshUnits()])
  await navigateTo(localePath(`/cards/${card.id}`))
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center gap-3">
      <UInput
        v-model="searchInput"
        icon="i-icon-park-outline-search"
        size="xl"
        class="flex-1"
        :placeholder="t('cards.searchPlaceholder')"
        :ui="{ base: 'rounded-2xl' }"
      >
        <template
          v-if="searchInput"
          #trailing
        >
          <UButton
            icon="i-icon-park-outline-close"
            color="neutral"
            variant="link"
            size="xs"
            :aria-label="t('common.clear')"
            @click="searchInput = ''"
          />
        </template>
      </UInput>

      <UButton
        icon="i-icon-park-outline-plus"
        color="primary"
        size="xl"
        class="juka-press"
        :aria-label="t('card.add')"
        @click="addOpen = true"
      >
        <span class="hidden sm:inline">{{ t('card.add') }}</span>
      </UButton>
    </div>

    <!-- Filter rail. Scrolls sideways on a phone rather than wrapping to four rows. -->
    <div class="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <button
        v-for="entry in CARD_STATUS_LIST"
        :key="entry.value"
        type="button"
        class="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition"
        :style="filters.status === entry.value
          ? { backgroundColor: entry.colour, color: '#fff' }
          : { backgroundColor: `color-mix(in oklab, ${entry.colour} 14%, transparent)`, color: entry.colour }"
        @click="toggleStatus(entry.value)"
      >
        {{ t(`status.${entry.value}`) }}
      </button>

      <span class="mx-1 w-px shrink-0 bg-[var(--ui-border)]" />

      <button
        v-for="count in [1, 2, 3, 4]"
        :key="`syllables-${count}`"
        type="button"
        class="shrink-0 rounded-full border px-3 py-1.5 text-sm transition"
        :class="filters.syllables === count
          ? 'border-primary-500 bg-primary-500 text-white'
          : 'border-[var(--ui-border)] text-[var(--ui-text-muted)]'"
        @click="toggleSyllables(count)"
      >
        {{ count }}字
      </button>

      <template v-if="units.length">
        <span class="mx-1 w-px shrink-0 bg-[var(--ui-border)]" />
        <button
          v-for="unit in units"
          :key="unit.id"
          type="button"
          class="shrink-0 rounded-full border px-3 py-1.5 text-sm transition"
          :class="filters.unitId === unit.id
            ? 'border-primary-500 bg-primary-500 text-white'
            : 'border-[var(--ui-border)] text-[var(--ui-text-muted)]'"
          @click="toggleUnit(unit.id)"
        >
          {{ unit.name }}
        </button>
      </template>
    </div>

    <div
      v-if="hasActiveFilters"
      class="flex items-center justify-between text-sm text-[var(--ui-text-muted)]"
    >
      <span>{{ t('cards.showing', { count: items.length }) }}</span>
      <UButton
        color="neutral"
        variant="link"
        size="xs"
        @click="clearFilters"
      >
        {{ t('cards.clearFilters') }}
      </UButton>
    </div>

    <div
      v-if="status === 'pending' && items.length === 0"
      class="space-y-3"
    >
      <USkeleton
        v-for="placeholder in 4"
        :key="placeholder"
        class="h-28 rounded-2xl"
      />
    </div>

    <div
      v-else-if="items.length === 0"
      class="rounded-2xl border border-dashed border-[var(--ui-border-accented)] p-10 text-center"
    >
      <p class="font-hanzi text-5xl text-primary-300">
        空
      </p>
      <p class="mt-3 font-medium">
        {{ hasActiveFilters ? t('cards.noMatches') : t('cards.empty') }}
      </p>
      <p class="mt-1 text-sm text-[var(--ui-text-muted)]">
        {{ hasActiveFilters ? t('cards.noMatchesHint') : t('cards.emptyHint') }}
      </p>
      <UButton
        v-if="!hasActiveFilters"
        class="juka-press mt-4"
        color="primary"
        size="lg"
        @click="addOpen = true"
      >
        {{ t('card.add') }}
      </UButton>
    </div>

    <div
      v-else
      class="space-y-3"
    >
      <CardTile
        v-for="card in items"
        :key="card.id"
        :card="card"
      />

      <div
        ref="sentinel"
        class="h-px"
      />

      <div
        v-if="hasMore"
        class="pt-2 text-center"
      >
        <UButton
          color="neutral"
          variant="soft"
          :loading="loadingMore"
          @click="loadMore"
        >
          {{ t('cards.loadMore') }}
        </UButton>
      </div>
    </div>

    <USlideover
      v-model:open="addOpen"
      :title="t('card.add')"
    >
      <template #body>
        <CardForm
          :units="units"
          @saved="onSaved"
          @cancel="addOpen = false"
        />
      </template>
    </USlideover>
  </div>
</template>
