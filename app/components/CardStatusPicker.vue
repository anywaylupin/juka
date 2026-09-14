<script setup lang="ts">
import { CARD_STATUS_LIST } from '#shared/constants/card-status'
import type { CardStatus } from '#shared/types/card'

defineProps<{
  modelValue: CardStatus
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: CardStatus] }>()

const { t } = useI18n()
</script>

<template>
  <div
    class="flex flex-wrap gap-2"
    role="radiogroup"
  >
    <button
      v-for="entry in CARD_STATUS_LIST"
      :key="entry.value"
      type="button"
      role="radio"
      :aria-checked="modelValue === entry.value"
      :disabled="disabled"
      class="juka-press rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-50"
      :style="modelValue === entry.value
        ? { backgroundColor: entry.colour, borderBottomColor: `color-mix(in oklab, ${entry.colour} 65%, black)`, color: '#fff' }
        : { backgroundColor: `color-mix(in oklab, ${entry.colour} 14%, transparent)`, borderBottomColor: `color-mix(in oklab, ${entry.colour} 35%, transparent)`, color: entry.colour }"
      @click="emit('update:modelValue', entry.value)"
    >
      {{ t(`status.${entry.value}`) }}
    </button>
  </div>
</template>
