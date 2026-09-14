<script setup lang="ts">
import { CARD_STATUS_LIST } from '#shared/constants/card-status'
import type { CardStatus } from '#shared/types/card'

const props = defineProps<{
  status: CardStatus
  size?: 'sm' | 'md'
}>()

const { t } = useI18n()

const definition = computed(
  () => CARD_STATUS_LIST.find(entry => entry.value === props.status) ?? CARD_STATUS_LIST[0]
)
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-medium"
    :class="size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'"
    :style="{
      backgroundColor: `color-mix(in oklab, ${definition.colour} 18%, transparent)`,
      color: definition.colour
    }"
  >
    <span
      class="size-2 rounded-full"
      :style="{ backgroundColor: definition.colour }"
    />
    {{ t(`status.${status}`) }}
  </span>
</template>
