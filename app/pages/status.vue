<script setup lang="ts">
/**
 * The old connection check page.
 * It showed D1 and R2 binding details to learners; the health check lives on at /api/health, and anyone with this URL saved lands in settings with their query intact.
 */
const route = useRoute();
const localePath = useLocalePath();
await navigateTo({ path: localePath('/settings'), query: route.query }, { replace: true, redirectCode: 301 });
</script>

<template>
  <div />
</template>
