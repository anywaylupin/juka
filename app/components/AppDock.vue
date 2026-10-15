<script setup lang="ts">
import type { ThemeName } from '#shared/constants/themes';

/**
 * The right edge: filters and display settings, a tab each.
 *
 * A drawer from the right, closed until asked for, so the table keeps the width of the screen.
 * The settings here are the ones that change how the box looks, laid out as labeled rows of segmented choices so each is one press rather than a menu.
 * The account, rating names and groups are on the profile page, because they are about what you own rather than how it is shown.
 */
const { t, locale, locales, setLocale } = useI18n();
const toast = useToast();
const store = useCardStore();
const groupStore = useGroups();
const flipMode = useFlipMode();
const { style: cardStyle, set: setStyle } = useCardStyle();
const { theme, themes, setTheme } = useJukaTheme();
const { groupsOpen } = useCardActions();
const { filters, toggle, clearGroup, clearAll } = useCardFilters(store.cards);

const tab = useState<'filters' | 'settings'>('juka:dock-tab', () => 'filters');
const tabs = computed(() => [
  { label: t('filter.title'), value: 'filters' as const, icon: 'i-lucide-sliders-horizontal' },
  { label: t('nav.settings'), value: 'settings' as const, icon: 'i-lucide-settings-2' }
]);

const modes = computed(() =>
  [
    { mode: 'light' as const, label: t('theme.light') },
    { mode: 'sepia' as const, label: t('theme.sepia') },
    { mode: 'dark' as const, label: t('theme.dark') }
  ].map((group) => ({ ...group, entries: themes.filter((entry) => entry.mode === group.mode) }))
);

/** Flags for the two interface languages; English is American English, so the flag is the US one. */
const FLAGS: Record<string, string> = { en: 'i-circle-flags-us', vi: 'i-circle-flags-vn' };

const fonts = computed(() => [
  { value: 'kai' as const, label: t('style.kai') },
  { value: 'song' as const, label: t('style.song') },
  { value: 'hei' as const, label: t('style.hei') }
]);

/** Each grid is shown by the character that names it, so the choice reads without a legend. */
const grids = computed(() => [
  { value: 'tian' as const, glyph: '田', label: t('style.gridTian') },
  { value: 'mi' as const, glyph: '米', label: t('style.gridMi') },
  { value: 'box' as const, glyph: '口', label: t('style.gridBox') },
  { value: 'none' as const, glyph: '字', label: t('style.gridNone') }
]);

async function choose(name: ThemeName) {
  try {
    await setTheme(name);
  } catch {
    toast.add({ title: t('theme.notSaved'), icon: 'i-icon-park-outline-caution', color: 'error' });
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <UTabs
      v-model="tab"
      :items="tabs"
      :content="false"
      color="neutral"
      variant="link"
      class="juka-tabs shrink-0 px-4 pt-1 sm:px-6"
      :ui="{ list: 'w-full', trigger: 'flex-1 justify-center' }"
    />

    <!-- Only this part scrolls; the gutter is reserved so a scrollbar appearing never narrows the content. -->
    <div class="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-6 [scrollbar-gutter:stable] sm:px-6">
      <FilterDrawer
        v-if="tab === 'filters'"
        :filters="filters"
        :cards="store.cards.value"
        :groups="groupStore.groups.value"
        @toggle-rating="toggle('ratings', $event)"
        @toggle-part="toggle('parts', $event)"
        @toggle-length="toggle('lengths', $event)"
        @toggle-group="toggle('groups', $event)"
        @clear-group="clearGroup"
        @clear-all="clearAll"
        @manage-groups="groupsOpen = true"
      />

      <div v-else class="space-y-6">
        <section class="space-y-2.5">
          <h3 class="juka-dock-heading"><UIcon name="i-lucide-pen-tool" />{{ t('style.font') }}</h3>
          <div class="juka-segment grid-cols-3" role="group" :aria-label="t('style.font')">
            <button
              v-for="font in fonts"
              :key="font.value"
              type="button"
              class="flex-col"
              :aria-pressed="cardStyle.font === font.value"
              @click="setStyle('font', font.value)"
            >
              <span class="juka-hanzi text-xl leading-none" :data-font="font.value" lang="zh" aria-hidden="true"
                ><span class="juka-cell-sample">字</span></span
              >
              <span class="text-xs">{{ font.label }}</span>
            </button>
          </div>
        </section>

        <section class="space-y-2.5">
          <h3 class="juka-dock-heading"><UIcon name="i-lucide-grid-2x2" />{{ t('style.grid') }}</h3>
          <div class="juka-segment grid-cols-4" role="group" :aria-label="t('style.grid')">
            <button
              v-for="grid in grids"
              :key="grid.value"
              type="button"
              class="flex-col"
              :aria-pressed="cardStyle.grid === grid.value"
              @click="setStyle('grid', grid.value)"
            >
              <span class="font-hanzi text-xl leading-none" lang="zh" aria-hidden="true">{{ grid.glyph }}</span>
              <span class="text-xs">{{ grid.label }}</span>
            </button>
          </div>
        </section>

        <section class="space-y-2.5">
          <div class="flex items-center justify-between">
            <h3 class="juka-dock-heading"><UIcon name="i-lucide-scaling" />{{ t('style.size') }}</h3>
            <span class="text-sm text-muted tabular-nums">{{ Math.round(cardStyle.size * 100) }}%</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-hanzi text-sm text-muted" lang="zh" aria-hidden="true">字</span>
            <USlider
              :model-value="cardStyle.size"
              :min="CARD_SIZE_RANGE.min"
              :max="CARD_SIZE_RANGE.max"
              :step="CARD_SIZE_RANGE.step"
              color="neutral"
              class="flex-1"
              :aria-label="t('style.size')"
              @update:model-value="setStyle('size', Number($event))"
            />
            <span class="font-hanzi text-2xl text-muted" lang="zh" aria-hidden="true">字</span>
          </div>
        </section>

        <section class="flex items-center justify-between gap-4">
          <div>
            <h3 class="juka-dock-heading"><UIcon name="i-lucide-palette" />{{ t('style.tones') }}</h3>
            <p class="text-xs text-muted">{{ t('style.tonesHint') }}</p>
          </div>
          <USwitch
            :model-value="cardStyle.tones"
            color="neutral"
            :aria-label="t('style.tones')"
            @update:model-value="setStyle('tones', $event)"
          />
        </section>

        <USeparator />

        <section class="space-y-2.5">
          <h3 class="juka-dock-heading"><UIcon name="i-lucide-refresh-ccw" />{{ t('view.turning') }}</h3>
          <div class="juka-segment grid-cols-2" role="group" :aria-label="t('view.turning')">
            <button type="button" :aria-pressed="flipMode === 'single'" @click="flipMode = 'single'">
              <UIcon name="i-lucide-square" />{{ t('view.turnOne') }}
            </button>
            <button type="button" :aria-pressed="flipMode === 'all'" @click="flipMode = 'all'">
              <UIcon name="i-lucide-copy" />{{ t('view.turnMany') }}
            </button>
          </div>
        </section>

        <section class="space-y-2.5">
          <h3 class="juka-dock-heading"><UIcon name="i-lucide-languages" />{{ t('settings.language') }}</h3>
          <div class="juka-segment grid-cols-2" role="group" :aria-label="t('settings.language')">
            <button
              v-for="entry in locales"
              :key="entry.code"
              type="button"
              :aria-pressed="locale === entry.code"
              @click="setLocale(entry.code)"
            >
              <UIcon :name="FLAGS[entry.code] ?? 'i-lucide-languages'" class="size-4" />{{ entry.name ?? entry.code }}
            </button>
          </div>
        </section>

        <section class="space-y-3">
          <h3 class="juka-dock-heading"><UIcon name="i-lucide-swatch-book" />{{ t('settings.theme') }}</h3>
          <div v-for="group in modes" :key="group.mode" class="space-y-1.5">
            <p class="text-xs text-muted">{{ group.label }}</p>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                v-for="entry in group.entries"
                :key="entry.name"
                type="button"
                class="juka-swatch"
                :aria-pressed="theme === entry.name"
                :title="entry.description"
                @click="choose(entry.name)"
              >
                <span class="size-4 shrink-0 rounded-full" :style="{ backgroundColor: entry.primary }" />
                <span class="truncate">{{ entry.label }}</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
