<script setup lang="ts">
/**
 * The left edge on wide screens: where you are and where you can go.
 *
 * A rail of icons at rest, widening to show the words on hover or keyboard focus.
 * It widens over the table rather than beside it, so the cards never reflow under the pointer on the way to a link.
 * The add button stays at the top of it; search lives on the table, with the cards it narrows.
 */
defineProps<{
  tabs: Array<{ to: string; label: string; icon: string }>;
}>();

const { t } = useI18n();
const localePath = useLocalePath();
const session = useSession();
const { openEditor, filtersOpen } = useCardActions();
</script>

<template>
  <nav class="juka-rail" :aria-label="t('nav.main')">
    <NuxtLink :to="localePath('/')" class="flex items-center gap-2 rounded-sm px-1" :aria-label="t('nav.home')">
      <AppLogo class="h-9 text-2xl" />
      <span class="juka-rail-label font-[family-name:var(--font-display)] text-xl font-bold text-highlighted"
        >Juka</span
      >
    </NuxtLink>

    <UButton
      class="juka-seal-button justify-start px-3.5 whitespace-nowrap"
      icon="i-lucide-plus"
      size="lg"
      block
      @click="openEditor()"
    >
      <span class="juka-rail-label">{{ t('card.add') }}</span>
    </UButton>

    <div class="flex flex-col gap-1">
      <NuxtLink
        v-for="tab in tabs.slice(0, -1)"
        :key="tab.to"
        :to="tab.to"
        class="juka-side-link"
        active-class="juka-side-link-active"
        exact-active-class="juka-side-link-active"
      >
        <UIcon :name="tab.icon" class="size-5" />
        <span class="juka-rail-label">{{ tab.label }}</span>
      </NuxtLink>
    </div>

    <USeparator />

    <button type="button" class="juka-side-link" @click="filtersOpen = true">
      <UIcon name="i-lucide-sliders-horizontal" class="size-5" />
      <span class="juka-rail-label">{{ t('dock.title') }}</span>
    </button>

    <div class="flex flex-col gap-1">
      <NuxtLink
        :to="tabs.at(-1)?.to"
        class="juka-side-link"
        active-class="juka-side-link-active"
        exact-active-class="juka-side-link-active"
      >
        <UIcon :name="tabs.at(-1)?.icon ?? ''" class="size-5" />
        <span class="juka-rail-label">{{ tabs.at(-1)?.label }}</span>
      </NuxtLink>
      <NuxtLink
        v-if="!session.signedIn.value"
        :to="localePath('/login')"
        class="juka-side-link"
        active-class="juka-side-link-active"
      >
        <UIcon name="i-lucide-log-in" class="size-5" />
        <span class="juka-rail-label">{{ t('auth.signIn') }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
