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
  <header class="sticky top-0 z-40 border-b border-default bg-default/90 backdrop-blur">
    <div class="flex min-h-16 w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6">
      <NuxtLink :to="localePath('/')" class="flex shrink-0 items-center gap-2 rounded-sm" :aria-label="t('nav.home')">
        <AppLogo class="h-9 text-2xl" />
        <span class="font-[family-name:var(--font-display)] text-xl font-bold text-highlighted">Juka</span>
      </NuxtLink>

      <div class="ml-auto flex shrink-0 items-center gap-2">
        <UButton class="juka-seal-button" icon="i-lucide-plus" size="lg" @click="openEditor()">
          <span class="hidden sm:inline">{{ t('card.add') }}</span>
          <span class="sr-only sm:hidden">{{ t('card.add') }}</span>
        </UButton>
        <UserMenu />
      </div>

      <SearchField v-if="showSearch" class="w-full" />
    </div>
  </header>
</template>
