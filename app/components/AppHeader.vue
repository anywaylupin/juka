<script setup lang="ts">
/**
 * The top bar on a phone: the logo, search and the one add button.
 *
 * Wide screens have the sidebar instead, and the page links live in the tab bar at the bottom here, where a thumb reaches.
 */
defineProps<{
  tabs: Array<{ to: string; label: string; icon: string }>;
}>();

const { t } = useI18n();
const route = useRoute();
const localePath = useLocalePath();
const { openEditor } = useCardActions();

/** Search narrows the cards, so it is offered only on the pages that show cards. */
const showSearch = computed(() => !/\/(settings|reset|login)$/.test(route.path));
</script>

<template>
  <UHeader :to="localePath('/')" :toggle="false" :ui="{ root: 'bg-default/90' }">
    <template #title>
      <AppLogo class="h-9 text-2xl" />
      <span class="font-display text-xl font-bold text-highlighted">Juka</span>
    </template>

    <template #right>
      <UButton
        class="juka-seal-button"
        icon="i-lucide-plus"
        size="lg"
        :aria-label="t('card.add')"
        @click="openEditor()"
      >
        <span class="hidden sm:inline">{{ t('card.add') }}</span>
      </UButton>
      <UserMenu />
    </template>

    <template v-if="showSearch" #bottom>
      <div class="px-4 pb-2 sm:px-6"><SearchField class="w-full" /></div>
    </template>
  </UHeader>
</template>
