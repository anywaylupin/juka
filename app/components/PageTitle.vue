<script setup lang="ts">
/**
 * A page title: its own character in the logo's seal, the name in the display face, and a quiet count or detail after it.
 *
 * The seal is decoration and hidden from screen readers; the heading text is the name.
 * The character is chosen for its meaning, not its sound: 盒 box, 习 practice, 进 progress.
 * Every title takes the same minimum width and height, so the title and the search after it sit in the same place on every page.
 */
defineProps<{
  glyph: string;
  title: string;
  detail?: string;
}>();
</script>

<template>
  <h1 class="flex min-h-11.5 min-w-0 shrink-0 items-center gap-3 lg:min-w-60">
    <AppLogo :glyph="glyph" class="h-10 text-2xl" />
    <span class="truncate font-display text-2xl font-bold text-highlighted">{{ title }}</span>
    <span v-if="detail" class="truncate text-base text-muted tabular-nums">{{ detail }}</span>
  </h1>
</template>
