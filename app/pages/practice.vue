<script setup lang="ts">
/**
 * One card at a time, from whatever the box is filtered to.
 *
 * It was the "stack" view behind an unlabelled icon on the box page.
 * As a page it says what it is for, and the filters you set on the box carry over, so "practice these" is a search and a tap.
 */
const { t } = useI18n();
useSeoMeta({ title: () => `${t('nav.practice')} · Juka` });

const store = useCardStore();
const { results, activeCount } = useCardFilters(store.cards);
const { filtersOpen, openEditor, rate, remove } = useCardActions();

const index = ref(0);
const practice = useCookie<boolean>('juka_practice', { default: () => true, sameSite: 'lax' });
const { ordered, reshuffle } = usePracticeOrder(
  results,
  computed(() => practice.value)
);

watch(results, (list) => {
  if (index.value >= list.length) {
    index.value = Math.max(0, list.length - 1);
  }
});
</script>

<template>
  <div class="flex min-h-full flex-col gap-4 lg:h-full lg:min-h-0">
    <!-- Title, search and actions share one row, level with the frame tab, so the cards start high on the table. -->
    <div class="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3">
      <PageTitle glyph="习" :title="t('nav.practice')" />
      <!-- Short, because a word is a few characters. -->
      <SearchField class="hidden lg:flex lg:w-88" />
      <div class="ml-auto flex items-center gap-2">
        <!-- A phone has no frame tab, so the button stays here below the wide breakpoint. -->
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-sliders-horizontal"
          class="lg:hidden"
          @click="filtersOpen = true"
        >
          {{ t('filter.title') }}
          <UBadge v-if="activeCount > 0" color="primary" size="sm" :label="String(activeCount)" />
        </UButton>
      </div>
    </div>

    <USkeleton v-if="!store.loaded.value" class="aspect-5/3.2 mx-auto w-full max-w-xl rounded-sm" />

    <UEmpty
      v-else-if="results.length === 0"
      icon="i-lucide-layers"
      class="mx-auto max-w-md"
      :title="t('cards.noMatches')"
      :description="t('practice.empty')"
    />

    <CardStack
      v-else
      v-model="index"
      v-model:practice="practice"
      class="lg:min-h-0 lg:flex-1"
      :cards="ordered"
      @reshuffle="reshuffle"
      @edit="openEditor"
      @remove="remove"
      @rate="rate"
    />
  </div>
</template>
