<script setup lang="ts">
import type { BoxView, FlipMode } from '~/composables/useBoxView';

/**
 * The top bar does the work here rather than a sidebar.
 *
 * Everything that is not a card lives on one line: what you are looking at, how you are looking at it, what you are looking for, and who you are.
 * The page below is then nothing but cards, which is the point of a box.
 */
defineProps<{
  view: BoxView;
  search: string;
  flipMode: FlipMode;
  /** Number of filters currently narrowing the box, for the badge. */
  filterCount: number;
  /** Cards left after filtering, so the count sits next to the search. */
  matches: number;
}>();

const emit = defineEmits<{
  'update:view': [value: BoxView];
  'update:search': [value: string];
  'update:flipMode': [value: FlipMode];
  'openFilters': [];
  'add': [];
}>();

const { t } = useI18n();
const localePath = useLocalePath();

const views: Array<{ value: BoxView; icon: string; label: string }> = [
  { value: 'gallery', icon: 'i-lucide-layout-grid', label: 'view.gallery' },
  { value: 'stack', icon: 'i-lucide-layers', label: 'view.stack' },
  { value: 'chart', icon: 'i-lucide-chart-column', label: 'view.chart' }
];
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-default bg-default/85 backdrop-blur">
    <div
      class="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-1 px-3 py-2 sm:h-14 sm:flex-nowrap sm:gap-2 sm:px-6 sm:py-0"
    >
      <NuxtLink :to="localePath('/')" class="flex shrink-0 items-center gap-2 rounded-md" :aria-label="t('nav.cards')">
        <UIcon name="i-icon-park-outline-orange" class="size-6 text-primary" />
        <span class="hidden text-base font-semibold tracking-tight text-highlighted lg:inline">Juka</span>
      </NuxtLink>

      <!-- How you are looking at the box. Icons with tooltips, not labels. -->
      <div class="flex shrink-0 items-center gap-0.5">
        <UTooltip v-for="entry in views" :key="entry.value" :text="t(entry.label)">
          <UButton
            :icon="entry.icon"
            :color="view === entry.value ? 'primary' : 'neutral'"
            :variant="view === entry.value ? 'soft' : 'ghost'"
            :aria-label="t(entry.label)"
            :aria-pressed="view === entry.value"
            @click="emit('update:view', entry.value)"
          />
        </UTooltip>
      </div>

      <!--
        Search lives up here with the other things that act on the whole box, rather than floating above the cards.
        It is the widest control in the bar because it is the one people aim at.
      -->
      <UInput
        :model-value="search"
        icon="i-lucide-search"
        class="order-last w-full min-w-0 sm:order-0 sm:w-auto sm:flex-1"
        :placeholder="t('cards.searchPlaceholder')"
        :aria-label="t('cards.searchPlaceholder')"
        @update:model-value="emit('update:search', String($event))"
      >
        <template #trailing>
          <span v-if="!search" class="hidden text-xs text-dimmed tabular-nums sm:inline">{{ matches }}</span>
          <UButton
            v-else
            icon="i-lucide-x"
            color="neutral"
            variant="link"
            size="xs"
            :aria-label="t('common.clear')"
            @click="emit('update:search', '')"
          />
        </template>
      </UInput>

      <div class="ml-auto flex shrink-0 items-center gap-0.5 sm:ml-0">
        <!-- Only meaningful in the gallery, so it only appears there. -->
        <UTooltip v-if="view === 'gallery'" :text="flipMode === 'single' ? t('view.flipSingle') : t('view.flipAll')">
          <UButton
            :icon="flipMode === 'single' ? 'i-lucide-square' : 'i-lucide-copy'"
            color="neutral"
            variant="ghost"
            :aria-label="flipMode === 'single' ? t('view.flipSingle') : t('view.flipAll')"
            @click="emit('update:flipMode', flipMode === 'single' ? 'all' : 'single')"
          />
        </UTooltip>

        <UTooltip :text="t('filter.title')">
          <UButton
            icon="i-lucide-sliders-horizontal"
            :color="filterCount > 0 ? 'primary' : 'neutral'"
            :variant="filterCount > 0 ? 'soft' : 'ghost'"
            :aria-label="t('filter.title')"
            @click="emit('openFilters')"
          >
            <UBadge v-if="filterCount > 0" color="primary" size="sm" :label="String(filterCount)" />
          </UButton>
        </UTooltip>

        <!-- The one add button in the app. -->
        <UTooltip :text="t('card.add')">
          <UButton icon="i-lucide-plus" color="primary" :aria-label="t('card.add')" @click="emit('add')" />
        </UTooltip>

        <USeparator orientation="vertical" class="mx-1 hidden h-6 sm:block" />

        <ThemePicker />
        <LocalePicker />
        <UserMenu />
      </div>
    </div>
  </header>
</template>
