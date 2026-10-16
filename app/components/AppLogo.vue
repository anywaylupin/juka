<script setup lang="ts">
/**
 * The mark: a character cut as a red seal, a little wider than tall.
 *
 * 卡, card, the second half of 橘卡, is the app's own mark; each page title stamps its own character in the same seal, so a page is named the way the app is.
 * `public/favicon.svg` is the 卡 seal, written by `scripts/build-favicon.ts`.
 */
withDefaults(defineProps<{ glyph?: string }>(), { glyph: '卡' });
</script>

<template>
  <span aria-hidden="true">{{ glyph }}</span>
</template>

<style scoped>
/* A red seal a little wider than tall. It never shrinks, so the rail cannot squeeze it; size it by height and the width follows. */
span {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  aspect-ratio: 44 / 38;
  width: auto;
  border-radius: 0.3rem;
  background: var(--juka-seal);
  box-shadow:
    inset 0 0 0 0.18rem var(--juka-seal),
    inset 0 0 0 0.26rem rgb(255 248 240 / 0.6);
  color: #fff8f0;
  font-family: var(--font-brush);
  line-height: 1;
}
</style>
