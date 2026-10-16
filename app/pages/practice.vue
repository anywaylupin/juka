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
const { results } = useCardFilters(store.cards);
const { openEditor, rate, remove } = useCardActions();

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
  <div class="flex flex-1 flex-col gap-4 lg:h-full lg:min-h-0">
    <!-- Title, search and actions share one row, level with the frame tab, so the cards start high on the table. -->
    <div class="hidden shrink-0 items-center gap-x-6 lg:flex">
      <PageTitle glyph="习" :title="t('nav.practice')" />
      <!-- Short, because a word is a few characters. -->
      <!-- Centered on the screen, level with the title, whatever the title's width. -->
      <SearchField class="hidden lg:fixed lg:top-5 lg:left-1/2 lg:z-30 lg:flex lg:w-72 lg:-translate-x-1/2" />
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
      class="flex-1 lg:min-h-0"
      :cards="ordered"
      @reshuffle="reshuffle"
      @edit="openEditor"
      @remove="remove"
      @rate="rate"
    />
  </div>
</template>
