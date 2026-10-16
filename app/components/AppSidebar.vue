<script setup lang="ts">
/**
 * The left edge on wide screens: where you are and where you can go.
 *
 * A rail of icons at rest, widening to show the words on hover or keyboard focus.
 * It widens over the table rather than beside it, so the cards never reflow under the pointer on the way to a link.
 * The links are a UNavigationMenu, collapsed to icons with tooltips while the rail is narrow; the add button stays at the top, and search lives on the table.
 * Every icon keeps one left offset in both states, padded so its center falls on the middle of the 4rem rail: centering them only while collapsed made each icon jump sideways as the rail opened.
 */
const props = defineProps<{
  tabs: Array<{ to: string; label: string; icon: string; kbd?: string }>;
}>();

const { t } = useI18n();
const localePath = useLocalePath();
const { openEditor } = useCardActions();

const expanded = ref(false);

/**
 * Whether the rail is open, the one place that decides it: the width, the labels and the table edge all read this.
 *
 * The width used to follow CSS `:hover` and `:focus-within` while the labels followed this flag, and the two disagreed after a click: the clicked link kept focus, so the rail stayed wide while the menu had already collapsed to icons, leaving a wide, empty sidebar.
 * Leaving with the mouse now closes it unless focus inside came from the keyboard, which is the only reason to hold it open.
 */
function leave(event: MouseEvent) {
  expanded.value = (event.currentTarget as HTMLElement).matches(':has(:focus-visible)');
}

/** Focus moving between links inside the rail is not leaving it. */
function blur(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
    expanded.value = false;
  }
}

/** Pages first, then the account, as two groups with a line between them. */
const items = computed(() => [props.tabs.slice(0, -1), props.tabs.slice(-1)]);
</script>

<template>
  <nav
    data-rail
    :data-expanded="expanded || undefined"
    :aria-label="t('nav.main')"
    @mouseenter="expanded = true"
    @mouseleave="leave"
    @focusin="expanded = true"
    @focusout="blur"
  >
    <NuxtLink :to="localePath('/')" class="flex items-center gap-2 rounded-sm px-0.75" :aria-label="t('nav.home')">
      <AppLogo class="h-9 text-2xl" />
      <span v-show="expanded" class="font-display text-xl font-bold text-highlighted">Juka</span>
    </NuxtLink>

    <UButton
      class="juka-seal-button justify-start px-3.5 whitespace-nowrap"
      icon="i-lucide-plus"
      size="lg"
      block
      :aria-label="t('card.add')"
      aria-keyshortcuts="n"
      data-kbd="N"
      @click="openEditor()"
    >
      <span v-show="expanded">{{ t('card.add') }}</span>
    </UButton>

    <UNavigationMenu
      :items="items"
      orientation="vertical"
      :collapsed="!expanded"
      color="neutral"
      :ui="{ link: 'min-h-11 justify-start px-3.5', linkLeadingIcon: 'size-5' }"
    >
      <template #item-leading="{ item }">
        <span :data-kbd="item.kbd" class="flex">
          <UIcon :name="item.icon" class="size-5 shrink-0" />
        </span>
      </template>
    </UNavigationMenu>
  </nav>
</template>

<style scoped>
/*
  At rest a 4rem rail of icons; on hover or keyboard focus it widens to 15rem, and the table's edge slides right with it, so the sidebar grows out of the frame instead of lying on top as a sheet.
*/
[data-rail] {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 4rem;
  padding: 1.25rem 0.5rem;
  overflow: hidden;
  background: var(--ui-bg);
  white-space: nowrap;
  transition: width 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
[data-rail][data-expanded] {
  width: 15rem;
}
[data-rail] :deep(.iconify) {
  flex-shrink: 0;
}
</style>
