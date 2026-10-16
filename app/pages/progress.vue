<script setup lang="ts">
/** How well you know the box, what kind of words are in it, and how often you add to it. */
const { t } = useI18n();
useSeoMeta({ title: () => `${t('nav.progress')} · Juka` });

const store = useCardStore();
const groupStore = useGroups();
const { results } = useCardFilters(store.cards);
</script>

<template>
  <div class="flex flex-col gap-4 lg:h-full lg:min-h-0">
    <PageTitle glyph="进" :title="t('nav.progress')" class="shrink-0" />
    <div v-if="!store.loaded.value" class="juka-skeleton-card max-w-xl rounded-sm" />
    <CardChart v-else class="lg:min-h-0 lg:flex-1" :cards="results" :groups="groupStore.groups.value" />
  </div>
</template>
