<script setup lang="ts">
import type { ThemeName } from '#shared/constants/themes'

const { locale } = useI18n()
const { theme } = useJukaTheme()

// The saved theme has to be known before the first paint, so it is fetched here
// rather than in a page.
const { data: preferences } = await useFetch<{ theme: ThemeName }>('/api/preferences')

if (preferences.value?.theme) {
  theme.value = preferences.value.theme
}

useHead({
  htmlAttrs: { lang: locale }
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
