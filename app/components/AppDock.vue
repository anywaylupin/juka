<script setup lang="ts">
import type { ThemeName } from '#shared/constants/themes';

/**
 * The right edge: filters and display settings, a tab each.
 *
 * A drawer from the right, closed until asked for, so the table keeps the width of the screen.
 * The settings here are the ones that change how the box looks, laid out as labelled rows of segmented choices so each is one press rather than a menu.
 * The account, rating names and groups are on the profile page, because they are about what you own rather than how it is shown.
 */
const { t, locale, locales, setLocale } = useI18n();
const toast = useToast();
const store = useCardStore();
const groupStore = useGroups();
const flipMode = useFlipMode();
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

async function choose(name: ThemeName) {
  try {
    await setTheme(name);
  } catch {
    toast.add({ title: t('theme.notSaved'), icon: 'i-icon-park-outline-caution', color: 'error' });
  }
}
</script>

<template>
  <div class="space-y-5">
    <UTabs
      v-model="tab"
      :items="tabs"
      :content="false"
      color="neutral"
      variant="link"
      class="juka-tabs"
      :ui="{ list: 'w-full', trigger: 'flex-1 justify-center' }"
    />

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
        <h3 class="juka-subheading text-base">{{ t('view.turning') }}</h3>
        <div class="juka-segment grid-cols-2" role="group" :aria-label="t('view.turning')">
          <button type="button" :aria-pressed="flipMode === 'single'" @click="flipMode = 'single'">
            {{ t('view.turnOne') }}
          </button>
          <button type="button" :aria-pressed="flipMode === 'all'" @click="flipMode = 'all'">
            {{ t('view.turnMany') }}
          </button>
        </div>
      </section>

      <section class="space-y-2.5">
        <h3 class="juka-subheading text-base">{{ t('settings.language') }}</h3>
        <div class="juka-segment grid-cols-2" role="group" :aria-label="t('settings.language')">
          <button
            v-for="entry in locales"
            :key="entry.code"
            type="button"
            :aria-pressed="locale === entry.code"
            @click="setLocale(entry.code)"
          >
            {{ entry.name ?? entry.code }}
          </button>
        </div>
      </section>

      <section class="space-y-3">
        <h3 class="juka-subheading text-base">{{ t('settings.theme') }}</h3>
        <div v-for="group in modes" :key="group.mode" class="space-y-1.5">
          <p class="text-xs text-muted">{{ group.label }}</p>
          <div class="grid grid-cols-2 gap-1.5">
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
</template>
