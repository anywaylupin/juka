<script setup lang="ts">
const { locale } = useI18n();

// Reads the theme cookie and puts data-theme on <html> during SSR, so the first
// paint is the right palette rather than the default one.
useJukaTheme();

useHead({
  htmlAttrs: { lang: locale }
});
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
