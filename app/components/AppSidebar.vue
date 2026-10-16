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
  tabs: Array<{ to: string; label: string; icon: string }>;
}>();

const { t } = useI18n();
const localePath = useLocalePath();
const { openEditor } = useCardActions();

const expanded = ref(false);

/** Pages first, then the account, as two groups with a line between them. */
const items = computed(() => [props.tabs.slice(0, -1), props.tabs.slice(-1)]);
</script>

<template>
  <nav
    class="juka-rail"
    :aria-label="t('nav.main')"
    @mouseenter="expanded = true"
    @mouseleave="expanded = false"
    @focusin="expanded = true"
    @focusout="expanded = false"
  >
    <NuxtLink :to="localePath('/')" class="flex items-center gap-2 rounded-sm px-[3px]" :aria-label="t('nav.home')">
      <AppLogo class="h-9 text-2xl" />
      <span v-show="expanded" class="font-[family-name:var(--font-display)] text-xl font-bold text-highlighted"
        >Juka</span
      >
    </NuxtLink>

    <UButton
      class="juka-seal-button justify-start px-3.5 whitespace-nowrap"
      icon="i-lucide-plus"
      size="lg"
      block
      :aria-label="t('card.add')"
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
    />
  </nav>
</template>
