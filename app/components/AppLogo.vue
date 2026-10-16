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
  <span class="juka-logo" aria-hidden="true">{{ glyph }}</span>
</template>
