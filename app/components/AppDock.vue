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
const { groupsOpen, bulk, updateFromDictionary } = useCardActions();
const { filters, results, toggle, clearGroup, clearAll } = useCardFilters(store.cards);

/**
 * Looking cards up again sits under the filters because it acts on exactly the cards they show.
 * It overwrites wording the user edited, so it asks first and says how many cards it will touch.
 */
const confirmOpen = ref(false);

function startUpdate() {
  confirmOpen.value = false;
  updateFromDictionary([...results.value]);
}

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

const turnTabs = computed(() => [
  { label: t('view.turnOne'), value: 'single', icon: 'i-lucide-square' },
  { label: t('view.turnMany'), value: 'all', icon: 'i-lucide-copy' }
]);
const localeTabs = computed(() =>
  locales.value.map((entry) => ({ label: entry.name ?? entry.code, value: entry.code, icon: FLAGS[entry.code] }))
);

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
      <template v-if="tab === 'filters'">
        <FilterDrawer
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

        <section class="mt-6 space-y-2 border-t border-default pt-5">
          <h3><UIcon name="i-lucide-refresh-cw" />{{ t('bulk.title') }}</h3>
          <p class="text-xs text-muted">{{ t('bulk.hint') }}</p>
          <UButton
            color="neutral"
            variant="outline"
            block
            icon="i-lucide-refresh-cw"
            :disabled="results.length === 0 || bulk.running"
            @click="confirmOpen = true"
          >
            {{ t('bulk.button', results.length) }}
          </UButton>
        </section>
      </template>

      <div v-else class="space-y-6">
        <section class="space-y-2.5">
          <h3><UIcon name="i-lucide-pen-tool" />{{ t('style.font') }}</h3>
          <UTabs
            :items="fonts"
            :model-value="cardStyle.font"
            variant="pill"
            color="neutral"
            size="sm"
            :content="false"
            class="w-full"
            :aria-label="t('style.font')"
            @update:model-value="setStyle('font', $event as typeof cardStyle.font)"
          >
            <template #leading="{ item }">
              <span class="leading-none" :data-font="item.value" lang="zh" aria-hidden="true">字</span>
            </template>
          </UTabs>
        </section>

        <section class="space-y-2.5">
          <h3><UIcon name="i-lucide-grid-2x2" />{{ t('style.grid') }}</h3>
          <UTabs
            :items="grids"
            :model-value="cardStyle.grid"
            variant="pill"
            color="neutral"
            size="sm"
            :content="false"
            class="w-full"
            :aria-label="t('style.grid')"
            @update:model-value="setStyle('grid', $event as typeof cardStyle.grid)"
          >
            <template #leading="{ item }">
              <span class="font-hanzi leading-none" lang="zh" aria-hidden="true">{{ item.glyph }}</span>
            </template>
          </UTabs>
        </section>

        <section class="space-y-2.5">
          <div class="flex items-center justify-between">
            <h3><UIcon name="i-lucide-scaling" />{{ t('style.size') }}</h3>
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
            <h3><UIcon name="i-lucide-palette" />{{ t('style.tones') }}</h3>
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
          <h3><UIcon name="i-lucide-refresh-ccw" />{{ t('view.turning') }}</h3>
          <UTabs
            v-model="flipMode"
            :items="turnTabs"
            variant="pill"
            color="neutral"
            size="sm"
            :content="false"
            class="w-full"
            :aria-label="t('view.turning')"
          />
        </section>

        <section class="space-y-2.5">
          <h3><UIcon name="i-lucide-languages" />{{ t('settings.language') }}</h3>
          <UTabs
            :items="localeTabs"
            :model-value="locale"
            variant="pill"
            color="neutral"
            size="sm"
            :content="false"
            class="w-full"
            :aria-label="t('settings.language')"
            @update:model-value="setLocale($event as typeof locale)"
          />
        </section>

        <section class="space-y-3">
          <h3><UIcon name="i-lucide-swatch-book" />{{ t('settings.theme') }}</h3>
          <div v-for="group in modes" :key="group.mode" class="space-y-1.5">
            <p class="text-xs text-muted">{{ group.label }}</p>
            <div class="grid grid-cols-3 gap-1.5">
              <UButton
                v-for="entry in group.entries"
                :key="entry.name"
                color="neutral"
                :variant="theme === entry.name ? 'soft' : 'ghost'"
                size="sm"
                class="justify-start"
                :aria-pressed="theme === entry.name"
                :title="entry.description"
                @click="choose(entry.name)"
              >
                <template #leading>
                  <span class="size-4 shrink-0 rounded-full" :style="{ backgroundColor: entry.primary }" />
                </template>
                <span class="truncate">{{ entry.label }}</span>
              </UButton>
            </div>
          </div>
        </section>
      </div>

      <UModal v-model:open="confirmOpen" :ui="JUKA_PANEL" :title="t('bulk.button', results.length)">
        <template #body>
          <p class="text-sm text-muted">{{ t('bulk.confirm', results.length) }}</p>
        </template>
        <template #footer>
          <div class="flex w-full justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="confirmOpen = false">{{ t('common.cancel') }}</UButton>
            <UButton class="juka-seal-button" icon="i-lucide-refresh-cw" @click="startUpdate">{{
              t('bulk.button', results.length)
            }}</UButton>
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>

<style scoped>
/* A section title: a small icon and the name, the way a settings row reads in a reader app. */
h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--ui-text-highlighted);
}
h3 > .iconify {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  color: var(--ui-text-muted);
}

/* The 字 sample in the hand picker takes the same font switch as a card. */
[data-font] {
  font-family: var(--font-hanzi);
}
[data-font='song'] {
  font-family: var(--font-display);
}
[data-font='hei'] {
  font-family: var(--font-hei);
}
</style>
