<script setup lang="ts">
import { CARD_STATUS_COLOURS } from '#shared/constants/card-status'
import type { CardStatus } from '#shared/types/card'

const props = withDefaults(defineProps<{
  counts: Record<CardStatus, number>
  total: number
  size?: number
  /** The count in the middle only earns its space at larger sizes. */
  showLabel?: boolean
}>(), {
  size: 24,
  showLabel: false
})

/** Ripening order, so the ring reads as fruit turning rather than a pie chart. */
const ORDER: CardStatus[] = ['difficult', 'hesitant', 'good', 'mastered']

const RADIUS = 38
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const segments = computed(() => {
  const total = Math.max(props.total, 1)
  let offset = 0

  return ORDER.map((status) => {
    const count = props.counts[status] ?? 0
    const length = (count / total) * CIRCUMFERENCE
    const segment = {
      status,
      colour: CARD_STATUS_COLOURS[status],
      length,
      offset,
      count
    }
    offset += length
    return segment
  }).filter(segment => segment.count > 0)
})

const mastered = computed(() => props.counts.mastered ?? 0)

const ripeness = computed(() =>
  props.total === 0 ? 0 : Math.round((mastered.value / props.total) * 100)
)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 100 100"
    role="img"
    :aria-label="`${mastered} of ${total} mastered`"
    class="shrink-0"
  >
    <!-- Stem and leaf, so the ring reads as a tangerine even at 24px. -->
    <path
      d="M50 8 L50 16"
      stroke="#6b4a2b"
      stroke-width="5"
      stroke-linecap="round"
    />
    <path
      d="M50 12 q10 -8 18 -3 q-6 9 -18 3 z"
      fill="#4f7a3a"
    />

    <!-- Unfilled remainder. Taupe, never grey. -->
    <circle
      cx="50"
      cy="50"
      :r="RADIUS"
      fill="none"
      stroke="var(--color-taupe-200)"
      stroke-width="16"
    />

    <g
      transform="rotate(-90 50 50)"
      stroke-width="16"
      fill="none"
    >
      <circle
        v-for="segment in segments"
        :key="segment.status"
        cx="50"
        cy="50"
        :r="RADIUS"
        :stroke="segment.colour"
        :stroke-dasharray="`${segment.length} ${CIRCUMFERENCE}`"
        :stroke-dashoffset="-segment.offset"
      />
    </g>

    <!-- Wedge separators. Subtle, but they make it fruit rather than a chart. -->
    <g
      stroke="var(--juka-surface, #fff6ee)"
      stroke-width="2"
      opacity="0.85"
    >
      <line
        v-for="wedge in 8"
        :key="wedge"
        x1="50"
        y1="50"
        x2="50"
        y2="12"
        :transform="`rotate(${wedge * 45} 50 50)`"
      />
    </g>

    <circle
      cx="50"
      cy="50"
      r="30"
      fill="var(--juka-surface, #fff6ee)"
    />

    <text
      v-if="showLabel"
      x="50"
      y="50"
      text-anchor="middle"
      dominant-baseline="central"
      font-size="22"
      font-weight="700"
      fill="currentColor"
    >
      {{ ripeness }}%
    </text>
  </svg>
</template>
