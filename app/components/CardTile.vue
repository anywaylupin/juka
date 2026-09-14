<script setup lang="ts">
import type { CardRecord } from '#shared/types/card'

defineProps<{ card: CardRecord }>()

const { visible: hanVietVisible } = useHanViet()
const { speak } = useSpeech()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink
    :to="localePath(`/cards/${card.id}`)"
    class="juka-card group flex items-center gap-4 rounded-2xl border border-[var(--ui-border)] border-b-4 bg-[var(--ui-bg)] p-4 transition-colors hover:border-primary-300"
  >
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="font-hanzi text-3xl leading-tight text-[var(--ui-text-highlighted)]">
          {{ card.hanzi }}
        </span>
        <span class="text-sm text-[var(--ui-text-muted)]">
          {{ card.pinyin }}
        </span>
        <span
          v-if="hanVietVisible && card.hanViet"
          class="text-sm italic text-primary-600"
        >
          {{ card.hanViet }}
        </span>
      </div>

      <p class="mt-1 truncate text-sm text-[var(--ui-text-toned)]">
        {{ card.translation }}
      </p>

      <div class="mt-2 flex flex-wrap items-center gap-2">
        <CardStatusBadge
          :status="card.status"
          size="sm"
        />
        <UBadge
          v-if="card.unitName"
          color="neutral"
          variant="subtle"
          size="sm"
        >
          {{ card.unitName }}
        </UBadge>
        <UBadge
          v-if="card.hskLevel"
          color="neutral"
          variant="outline"
          size="sm"
        >
          HSK {{ card.hskLevel }}
        </UBadge>
      </div>
    </div>

    <UButton
      icon="i-icon-park-outline-volume-notice"
      color="neutral"
      variant="ghost"
      size="lg"
      :aria-label="`Play ${card.hanzi}`"
      @click.prevent.stop="speak(card.hanzi)"
    />
  </NuxtLink>
</template>

<style scoped>
.juka-card {
  /* Keeps a long list cheap to render without a windowing library. */
  content-visibility: auto;
  contain-intrinsic-size: auto 116px;
}
</style>
