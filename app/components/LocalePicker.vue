<script setup lang="ts">
/**
 * Two languages, shown as flags.
 *
 * A flag is a country and a language is not, which is normally a good reason to
 * avoid them. Here the two languages happen to be the national languages of the
 * two countries whose flags these are, the set is closed at two, and a flag is
 * readable at 20px where "Tiếng Việt" is not.
 */
const { locale, locales, setLocale } = useI18n()
const { t } = useI18n()

const FLAGS: Record<string, string> = {
  en: 'i-circle-flags-gb',
  vi: 'i-circle-flags-vn'
}

const items = computed(() => [
  locales.value.map(entry => ({
    label: entry.name ?? entry.code,
    icon: FLAGS[entry.code],
    /** A tick would compete with the flag, so the current one is just checked. */
    checked: locale.value === entry.code,
    type: 'checkbox' as const,
    onSelect: () => setLocale(entry.code)
  }))
])

const currentFlag = computed(() => FLAGS[locale.value] ?? 'i-lucide-languages')
</script>

<template>
  <UDropdownMenu :items="items">
    <UTooltip :text="t('nav.language')">
      <UButton
        color="neutral"
        variant="ghost"
        :aria-label="t('nav.language')"
        :icon="currentFlag"
      />
    </UTooltip>
  </UDropdownMenu>
</template>
