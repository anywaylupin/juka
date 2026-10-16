<script setup lang="ts">
import type { NuxtError } from '#app';

/**
 * Any page that fails to render, a missing route included, as Nuxt UI's error screen: the status, the message, and a way back to the box.
 */
defineProps<{ error: NuxtError }>();
</script>

<template>
  <UApp>
    <UError :error="error" :clear="{ label: 'Juka', to: '/', color: 'neutral', variant: 'outline' }" />
  </UApp>
</template>
