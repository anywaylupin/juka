<script setup lang="ts">
import type { CardFilters } from '~/composables/useCardFilters';

/**
 * The top bar: where you are, what you are looking for, and the one add button.
 *
 * Box, Practice and Progress are pages now rather than three icons that swapped views in place, so they read as words with the current one underlined in ink.
 * On a phone the same links move to the tab bar at the bottom, where a thumb reaches.
 * Theme, language and rating names moved to the settings page, which leaves this bar with nothing that needs a tooltip to be understood.
 */
const props = defineProps<{
  tabs: Array<{ to: string; label: string; icon: string }>;
}>();

const { t } = useI18n();
const route = useRoute();
const localePath = useLocalePath();
const { openEditor } = useCardActions();

const filters = useState<CardFilters>('juka:filters');
const search = ref(filters.value?.q ?? '');
let timer: ReturnType<typeof setTimeout> | undefined;

watch(search, (value) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    filters.value = { ...filters.value, q: value };
  }, 180);
});

onBeforeUnmount(() => clearTimeout(timer));

/** Search narrows the cards, so it is offered only on the pages that show cards. */
const showSearch = computed(() => !/\/(settings|reset)$/.test(route.path));

/** The three pages that show cards; settings sits behind the account corner on wide screens. */
const pages = computed(() => props.tabs.filter((tab) => !tab.to.endsWith('/settings')));
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-default bg-default/90 backdrop-blur">
    <div
      class="mx-auto flex min-h-16 w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 sm:flex-nowrap sm:px-6"
    >
      <NuxtLink :to="localePath('/')" class="flex shrink-0 items-center gap-2 rounded-sm" :aria-label="t('nav.home')">
        <span class="juka-seal size-9 text-2xl" aria-hidden="true">橘</span>
        <span class="hidden text-lg font-extrabold text-highlighted sm:inline">Juka</span>
      </NuxtLink>

      <nav class="hidden items-center gap-1 lg:flex" :aria-label="t('nav.main')">
        <NuxtLink
          v-for="tab in pages"
          :key="tab.to"
          :to="tab.to"
          class="juka-navlink"
          active-class="juka-navlink-active"
          exact-active-class="juka-navlink-active"
        >
          {{ tab.label }}
        </NuxtLink>
      </nav>

      <div class="ml-auto flex shrink-0 items-center gap-2 sm:order-last">
        <UButton class="juka-seal-button" icon="i-lucide-plus" size="lg" @click="openEditor()">
          <span class="hidden sm:inline">{{ t('card.add') }}</span>
          <span class="sr-only sm:hidden">{{ t('card.add') }}</span>
        </UButton>
        <UserMenu />
      </div>

      <UInput
        v-if="showSearch"
        v-model="search"
        icon="i-lucide-search"
        size="lg"
        variant="none"
        class="juka-search order-last w-full min-w-0 sm:order-none sm:w-auto sm:flex-1"
        :placeholder="t('cards.searchPlaceholder')"
        :aria-label="t('cards.searchPlaceholder')"
      >
        <template v-if="search" #trailing>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="link"
            :aria-label="t('common.clear')"
            @click="search = ''"
          />
        </template>
      </UInput>
    </div>
  </header>
</template>
