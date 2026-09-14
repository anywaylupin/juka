<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { visible: hanVietVisible, toggle: toggleHanViet } = useHanViet()

const links = computed(() => [
  { label: t('nav.cards'), to: localePath('/'), icon: 'i-icon-park-outline-list-two' },
  { label: t('nav.units'), to: localePath('/units'), icon: 'i-icon-park-outline-folder-open' }
])
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-[var(--ui-border)] bg-[var(--juka-surface)]/90 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
      <NuxtLink
        :to="localePath('/')"
        class="font-hanzi text-2xl font-bold text-primary-600"
      >
        橘卡
      </NuxtLink>

      <nav class="ml-2 flex items-center gap-1">
        <UButton
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :icon="link.icon"
          color="neutral"
          variant="ghost"
          size="sm"
        >
          <span class="hidden sm:inline">{{ link.label }}</span>
        </UButton>
      </nav>

      <div class="ml-auto flex items-center gap-1">
        <UButton
          :icon="hanVietVisible ? 'i-icon-park-outline-preview-open' : 'i-icon-park-outline-preview-close'"
          color="neutral"
          variant="ghost"
          :aria-label="t('nav.hanViet')"
          :title="t('nav.hanViet')"
          @click="toggleHanViet"
        />
        <ThemePicker />
        <LocalePicker />
      </div>
    </div>
  </header>
</template>
