<script setup lang="ts">
/**
 * One card at a time, from whatever the box is filtered to.
 *
 * It was the "stack" view behind an unlabelled icon on the box page.
 * As a page it says what it is for, and the filters you set on the box carry over, so "practise these" is a search and a tap.
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
  <div class="space-y-5">
    <div class="flex flex-wrap items-end gap-x-4 gap-y-3">
      <h1 class="juka-heading mr-auto">
        {{ t('nav.practice') }}
        <span class="ml-1 text-base font-normal text-muted tabular-nums">{{ t('cards.count', results.length) }}</span>
      </h1>
      <UButton color="neutral" variant="outline" icon="i-lucide-sliders-horizontal" @click="filtersOpen = true">
        {{ t('filter.title') }}
        <UBadge v-if="activeCount > 0" color="primary" size="sm" :label="String(activeCount)" />
      </UButton>
    </div>

    <div v-if="!store.loaded.value" class="juka-skeleton-card mx-auto max-w-[26rem] rounded-sm" />

    <div v-else-if="results.length === 0" class="juka-paper mx-auto max-w-md p-10 text-center">
      <h2 class="font-semibold text-highlighted">{{ t('cards.noMatches') }}</h2>
      <p class="mt-1 text-sm text-muted">{{ t('practice.empty') }}</p>
    </div>

    <CardStack
      v-else
      v-model="index"
      v-model:practice="practice"
      :cards="ordered"
      @reshuffle="reshuffle"
      @edit="openEditor"
      @remove="remove"
      @rate="rate"
    />
  </div>
</template>
