<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

const options = computed(() =>
  locales.value.map(entry => ({
    label: entry.name ?? entry.code,
    value: entry.code
  }))
)
</script>

<template>
  <USelectMenu
    :model-value="locale"
    :items="options"
    value-key="value"
    color="neutral"
    variant="ghost"
    class="w-32"
    @update:model-value="setLocale($event)"
  />
</template>
