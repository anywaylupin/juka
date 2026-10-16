<script setup lang="ts">
/**
 * The keyboard layer of the whole app: a card finder on Ctrl K and the list of every key on `.`.
 *
 * The finder is `UCommandPalette` in a `UModal` rather than `UContentSearch`, which is built around Nuxt Content's pages and navigation and has nothing to index here.
 * Picking a card opens it in the editor, because that is the one place a single card is shown on its own.
 * Practice keeps its own keys in `CardStack`, and they are listed here so the guide is the whole truth.
 */
const { t } = useI18n();
const localePath = useLocalePath();
const store = useCardStore();
const session = useSession();
const { openEditor, filtersOpen } = useCardActions();
const { locale } = useI18n();

const searchOpen = ref(false);
const helpOpen = useState('juka:shortcuts', () => false);

/** The single-key actions, also bound with Alt held, so the hints that Alt shows can be pressed while it is still down. */
const ACTIONS: Record<string, () => unknown> = {
  n: () => openEditor(),
  f: () => (filtersOpen.value = true)
};

/**
 * Pages sit on Alt and the bottom row of the left hand, in the order their icons stand in the sidebar: Z Box, X Practice, C Progress, B the profile (or signing in).
 * V is held for a page still to come, so it is left unbound rather than pointed somewhere it would have to be taken back from.
 * G then B chords came first and were dropped: two keys in a row is a sequence to remember, and Alt with one key shows its own map as badges.
 *
 * Matched on the physical key (`KeyZ`) rather than the character typed.
 * With a Vietnamese input method such as Telex the browser reports a letter as `Process` while it composes, so a character match never fired.
 * The browser's own Ctrl K, which jumps to the address bar, is prevented by the handler; shortcuts the operating system takes first never reach a page at all.
 */
defineShortcuts(
  {
    meta_k: () => (searchOpen.value = !searchOpen.value),
    ...ACTIONS,
    ...Object.fromEntries(Object.entries(ACTIONS).map(([key, run]) => [`alt_${key}`, run])),
    alt_z: () => navigateTo(localePath('/')),
    alt_x: () => navigateTo(localePath('/practice')),
    alt_c: () => navigateTo(localePath('/progress')),
    alt_b: () => navigateTo(localePath(session.signedIn.value ? '/settings' : '/login'))
  },
  { layoutIndependent: true }
);

/** Punctuation stays on the character: `.` and `/` sit on different physical keys from one keyboard layout to the next. */
defineShortcuts({
  '.': () => (helpOpen.value = !helpOpen.value),
  '/': () => document.querySelector<HTMLInputElement>('#juka-search')?.focus()
});

/**
 * Holding Alt marks the page, and `base.css` draws each control's key from its `data-kbd` over its corner, the way a desktop app underlines its menu letters.
 * Alt with `.` opens the guide here too, because with Alt held the shortcut matcher compares physical codes and `Period` never equals `.`.
 * Letting Alt go alone is prevented, or Windows browsers would move focus to their menu bar.
 */
function onAlt(event: KeyboardEvent) {
  if (event.type === 'keydown' && event.altKey && event.code === 'Period') {
    event.preventDefault();
    helpOpen.value = !helpOpen.value;
  }
  if (event.key !== 'Alt') return;
  if (event.type === 'keyup') event.preventDefault();
  document.documentElement.toggleAttribute('data-alt', event.type === 'keydown');
}

function clearAlt() {
  delete document.documentElement.dataset.alt;
}

onMounted(() => {
  window.addEventListener('keydown', onAlt);
  window.addEventListener('keyup', onAlt);
  window.addEventListener('blur', clearAlt);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onAlt);
  window.removeEventListener('keyup', onAlt);
  window.removeEventListener('blur', clearAlt);
});

const groups = computed(() => [
  {
    id: 'cards',
    label: t('shortcuts.cards'),
    items: store.cards.value.map((card) => ({
      label: card.hanzi,
      suffix: `${card.pinyin} · ${locale.value === 'vi' ? card.translationVi || card.translation : card.translation}`,
      onSelect: () => {
        searchOpen.value = false;
        openEditor(card);
      }
    }))
  },
  {
    id: 'go',
    label: t('shortcuts.goTo'),
    items: [
      { label: t('nav.box'), icon: 'i-lucide-layout-grid', kbds: ['alt', 'Z'], to: localePath('/') },
      { label: t('nav.practice'), icon: 'i-lucide-layers', kbds: ['alt', 'X'], to: localePath('/practice') },
      { label: t('nav.progress'), icon: 'i-lucide-chart-column', kbds: ['alt', 'C'], to: localePath('/progress') },
      {
        label: t('shortcuts.title'),
        icon: 'i-lucide-keyboard',
        kbds: ['.'],
        onSelect: () => {
          searchOpen.value = false;
          helpOpen.value = true;
        }
      }
    ].map((item) => ({ ...item, onSelect: item.onSelect ?? (() => (searchOpen.value = false)) }))
  }
]);

/** Every key in the app, grouped the way the guide shows them. */
const sections = computed(() => [
  {
    title: t('shortcuts.everywhere'),
    keys: [
      { kbds: ['meta', 'K'], label: t('shortcuts.find') },
      { kbds: ['N'], label: t('card.add') },
      { kbds: ['/'], label: t('cards.searchPlaceholder') },
      { kbds: ['F'], label: t('dock.title') },
      { kbds: ['.'], label: t('shortcuts.title') },
      { kbds: ['alt'], label: t('shortcuts.hints') }
    ]
  },
  {
    title: t('shortcuts.goTo'),
    keys: [
      { kbds: ['alt', 'Z'], label: t('nav.box') },
      { kbds: ['alt', 'X'], label: t('nav.practice') },
      { kbds: ['alt', 'C'], label: t('nav.progress') },
      { kbds: ['alt', 'B'], label: session.signedIn.value ? t('nav.profile') : t('auth.signIn') }
    ]
  },
  {
    title: t('nav.practice'),
    keys: [
      { kbds: ['A', '←'], label: t('stack.keyBack') },
      { kbds: ['D', '→'], label: t('stack.keyNext') },
      { kbds: ['1', '2', '3', '4', '5'], label: t('stack.keyRate') },
      { kbds: ['Q'], label: t('stack.keyListen') },
      { kbds: ['E'], label: t('card.edit') },
      { kbds: ['R'], label: t('stack.reshuffle') },
      { kbds: ['W', 'S', '↑', '↓'], label: t('stack.keyTurn') }
    ]
  }
]);
</script>

<template>
  <UModal v-model:open="searchOpen" :ui="{ content: 'sm:max-w-xl' }" :title="t('shortcuts.find')">
    <template #content>
      <UCommandPalette
        :groups="groups"
        :placeholder="t('cards.searchPlaceholder')"
        :fuse="{ fuseOptions: { keys: ['label', 'suffix'], ignoreDiacritics: true }, resultLimit: 30 }"
        class="h-96"
        close
        @update:open="searchOpen = $event"
      />
    </template>
  </UModal>

  <UModal v-model:open="helpOpen" :ui="JUKA_PANEL" :title="t('shortcuts.title')">
    <template #body>
      <div class="space-y-5">
        <section v-for="section in sections" :key="section.title">
          <h3 class="mb-2 juka-subheading text-sm">{{ section.title }}</h3>
          <ul class="space-y-1.5">
            <li v-for="key in section.keys" :key="key.label" class="flex items-center gap-3 text-sm">
              <span class="flex-1 text-highlighted">{{ key.label }}</span>
              <span class="flex gap-1"><UKbd v-for="kbd in key.kbds" :key="kbd" :value="kbd" /></span>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </UModal>
</template>
