<script setup lang="ts">
/**
 * The top bar on a phone and a tablet: the current page's seal and title on the left, icons on the right.
 *
 * It names the page rather than the app, the way the sidebar's logo plus a page title do on a wide screen, so the page itself does not repeat its title below the bar.
 * Everything else is an icon: filters and settings open the drawer, and the red seal adds a card.
 * Search opens in the bar itself, in place of the title, rather than as a second row: a row under a fixed height header spilled over the top of the page.
 * The account lives in the tab bar at the bottom.
 */
const { t } = useI18n();
const route = useRoute();
const localePath = useLocalePath();
const session = useSession();
const { openEditor, filtersOpen } = useCardActions();
const { activeCount } = useCardFilters(useCardStore().cards);

/** The pages that show cards, which are the ones search and the filters can narrow. */
const showsCards = computed(() => !/\/(settings|reset|login)$/.test(route.path));

const page = computed(() => {
  const path = route.path.replace(/^\/vi(?=\/|$)/, '') || '/';
  if (path.startsWith('/practice')) return { glyph: '习', title: t('nav.practice') };
  if (path.startsWith('/progress')) return { glyph: '进', title: t('nav.progress') };
  if (path.startsWith('/settings')) {
    return {
      glyph: session.account.value?.username?.[0]?.toUpperCase() ?? '我',
      title: session.account.value?.username ?? t('nav.profile')
    };
  }
  if (path.startsWith('/login')) return { glyph: '卡', title: t('auth.signIn') };
  return { glyph: '盒', title: t('nav.box') };
});

const searching = ref(false);

watch(
  () => route.path,
  () => {
    searching.value = false;
  }
);
</script>

<template>
  <UHeader :toggle="false" :ui="{ root: 'bg-default/90', container: 'items-center gap-2', left: 'min-w-0 flex-1' }">
    <template #left>
      <SearchField v-if="searching && showsCards" class="min-w-0 flex-1" autofocus />
      <NuxtLink v-else :to="localePath('/')" class="flex min-w-0 items-center gap-2">
        <AppLogo :glyph="page.glyph" class="h-9 text-2xl" />
        <span class="truncate font-display text-xl leading-none font-bold text-highlighted">{{ page.title }}</span>
      </NuxtLink>
    </template>

    <template #right>
      <UButton
        v-if="showsCards"
        :icon="searching ? 'i-lucide-x' : 'i-lucide-search'"
        color="neutral"
        variant="ghost"
        square
        :aria-label="searching ? t('common.close') : t('cards.searchPlaceholder')"
        :aria-pressed="searching"
        @click="searching = !searching"
      />
      <UChip v-if="showsCards && !searching" :show="activeCount > 0" :text="activeCount" size="lg" color="primary">
        <UButton
          icon="i-lucide-sliders-horizontal"
          color="neutral"
          variant="ghost"
          square
          :aria-label="t('dock.title')"
          @click="filtersOpen = true"
        />
      </UChip>
      <UButton
        v-if="!searching"
        class="juka-seal-button"
        icon="i-lucide-plus"
        square
        :aria-label="t('card.add')"
        @click="openEditor()"
      />
    </template>
  </UHeader>
</template>
