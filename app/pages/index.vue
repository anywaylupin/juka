<script setup lang="ts">
/**
 * The box: every card, laid out and paged.
 *
 * Practice and Progress were views on this page behind three unlabelled icons; they are their own pages now, and this one does one job.
 */
definePageMeta({ name: 'cards' });

const { t } = useI18n();
useSeoMeta({ title: () => `${t('nav.box')} · Juka`, description: () => t('tagline') });

const store = useCardStore();
const flipMode = useFlipMode();
const { results, activeCount, clearAll } = useCardFilters(store.cards);
const { filtersOpen, openEditor, rate, remove } = useCardActions();

const page = ref(1);
const PAGE_SIZE = 12;

watch(results, () => {
  page.value = 1;
});
</script>

<template>
  <div class="flex min-h-full flex-col gap-5 lg:h-full lg:min-h-0">
    <!-- Title, search and actions share one row, level with the frame tab, so the cards start high on the table. -->
    <div class="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3">
      <PageTitle glyph="盒" :title="t('nav.box')" />
      <SearchField class="juka-table-search hidden lg:flex" />
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

    <UAlert
      v-if="store.failed.value"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('cards.failed')"
      :description="t('cards.failedHint')"
      :actions="[{ label: t('common.retry'), color: 'error', variant: 'soft', onClick: () => store.load() }]"
    />

    <div
      v-else-if="!store.loaded.value"
      class="grid grid-cols-[repeat(auto-fill,minmax(max(15rem,calc((100%-3rem)/4)),1fr))] gap-4"
    >
      <USkeleton v-for="placeholder in 8" :key="placeholder" class="aspect-[5/3.2] rounded-sm" />
    </div>

    <UEmpty
      v-else-if="results.length === 0"
      icon="i-lucide-inbox"
      class="mx-auto max-w-md"
      :title="activeCount > 0 ? t('cards.noMatches') : t('cards.empty')"
      :description="activeCount > 0 ? t('cards.noMatchesHint') : t('cards.emptyHint')"
      :actions="
        activeCount > 0
          ? [
              {
                label: t('filter.clearAll'),
                icon: 'i-lucide-filter-x',
                color: 'neutral',
                variant: 'outline',
                onClick: clearAll
              }
            ]
          : [{ label: t('card.add'), icon: 'i-lucide-plus', class: 'juka-seal-button', onClick: () => openEditor() }]
      "
    />

    <CardGallery
      v-else
      v-model:page="page"
      :cards="results"
      :page-size="PAGE_SIZE"
      :flip-mode="flipMode"
      @edit="openEditor"
      @remove="remove"
      @rate="rate"
    />
  </div>
</template>
