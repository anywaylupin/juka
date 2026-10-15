<script setup lang="ts">
/** How well you know the box, what kind of words are in it, and how often you add to it. */
const { t } = useI18n();
useSeoMeta({ title: () => `${t('nav.progress')} · Juka` });

const store = useCardStore();
const groupStore = useGroups();
const { results } = useCardFilters(store.cards);
</script>

<template>
  <div class="space-y-6">
    <h1 class="juka-heading">{{ t('nav.progress') }}</h1>
    <div v-if="!store.loaded.value" class="juka-skeleton-card max-w-xl rounded-sm" />
    <CardChart v-else :cards="results" :groups="groupStore.groups.value" />
  </div>
</template>
