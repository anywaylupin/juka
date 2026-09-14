<script setup lang="ts">
import type { Rating } from '#shared/constants/rating'
import type { CardRecord } from '#shared/types/card'

/**
 * One card at a time, as a stack you deal off the top.
 *
 * The top card follows the finger. Let go past a threshold and it goes: right
 * to keep and move on, left to the bin with an undo, up or down to turn it
 * over. A tap turns it over too, because that is what tapping a card does.
 *
 * Two cards are drawn behind the top one, offset and scaled, so the stack has
 * depth and you can see there is more to come without counting.
 *
 * The order comes from usePracticeOrder, which deals weakly known cards more
 * often. That is the only place in the app where a rating decides what comes
 * next, and it is confined to this view.
 */
const props = defineProps<{
  cards: CardRecord[]
  modelValue: number
  /** True when the deck is weighted toward the cards you know least. */
  practice: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [index: number]
  'update:practice': [value: boolean]
  'reshuffle': []
  'edit': [card: CardRecord]
  'remove': [card: CardRecord]
  'rate': [card: CardRecord, value: Rating]
}>()

const { t } = useI18n()

const flipped = ref(false)

const current = computed<CardRecord | null>(() => props.cards[props.modelValue] ?? null)

/** The two behind, for depth. Wraps, so the stack never looks like it ran out. */
const behind = computed(() =>
  [1, 2]
    .map(offset => props.cards[(props.modelValue + offset) % props.cards.length])
    .filter((card): card is CardRecord => Boolean(card) && props.cards.length > 1)
)

watch(() => props.modelValue, () => {
  flipped.value = false
})

function advance() {
  if (props.cards.length === 0) {
    return
  }
  emit('update:modelValue', (props.modelValue + 1) % props.cards.length)
}

function back() {
  if (props.cards.length === 0) {
    return
  }
  emit('update:modelValue', (props.modelValue - 1 + props.cards.length) % props.cards.length)
}

const { state, rotation, handlers } = useCardDrag({
  onOutcome(outcome) {
    if (outcome === 'flip') {
      flipped.value = !flipped.value
      return
    }
    if (outcome === 'keep') {
      advance()
      return
    }
    if (outcome === 'bin' && current.value) {
      emit('remove', current.value)
    }
  }
})

/**
 * -1 to 1, handed to the card so it can show the outcome itself.
 *
 * Negative is toward the bin and turns the card red; positive is toward keep
 * and lifts the next card out from underneath. Two floating chips used to do
 * this, and they covered the word you were deciding about.
 */
const intent = computed(() => (state.dragging ? Math.max(-1, Math.min(1, state.x / 110)) : 0))

/** 0 to 1 toward keep, which is what lifts the next card into view. */
const keeping = computed(() => Math.max(0, intent.value))

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable]')) {
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    advance()
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    back()
  }
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    flipped.value = !flipped.value
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div
    v-if="current"
    class="space-y-5"
  >
    <div class="flex items-center justify-center gap-2">
      <UTooltip :text="practice ? t('stack.practiceOn') : t('stack.practiceOff')">
        <UButton
          icon="i-lucide-shuffle"
          :color="practice ? 'primary' : 'neutral'"
          :variant="practice ? 'soft' : 'ghost'"
          size="sm"
          :aria-pressed="practice"
          @click="emit('update:practice', !practice)"
        >
          {{ t('stack.practice') }}
        </UButton>
      </UTooltip>

      <UTooltip
        v-if="practice"
        :text="t('stack.reshuffle')"
      >
        <UButton
          icon="i-lucide-rotate-cw"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('stack.reshuffle')"
          @click="emit('reshuffle')"
        />
      </UTooltip>
    </div>

    <!--
      The arrows sit beside the card and centred against it, rather than in a
      row underneath. A stack is a thing you step through sideways, so the
      controls belong on the sides where a thumb already is.
    -->
    <div class="flex items-center justify-center gap-3 sm:gap-5">
      <UTooltip :text="t('cards.previous')">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="outline"
          size="xl"
          class="shrink-0"
          :aria-label="t('cards.previous')"
          @click="back"
        />
      </UTooltip>

      <div class="relative w-full max-w-md">
        <!--
          The stack underneath. Normally just depth, but the first one rises to
          meet you as the top card is swiped right, so the next card is already
          arriving rather than appearing after the fact.
        -->
        <div
          v-for="(card, depth) in behind"
          :key="card.id"
          class="pointer-events-none absolute inset-0"
          :class="!state.dragging && 'transition-transform duration-300'"
          :style="{
            transform: `translateY(${(depth + 1) * 12 * (depth === 0 ? 1 - keeping : 1)}px) scale(${1 - (depth + 1) * 0.045 + (depth === 0 ? keeping * 0.045 : 0)})`
          }"
        >
          <CardFace
            :card="card"
            size="lg"
            inert
          />
        </div>

        <div
          class="juka-draggable relative z-10"
          :class="!state.dragging && 'transition-transform duration-300'"
          :style="{
            transform: `translate(${state.x}px, ${state.y}px) rotate(${rotation}deg)`
          }"
          v-on="handlers"
        >
          <!--
            The drag composable owns the gesture here, so the card's own
            click-to-flip is switched off. Leaving both on means a tap fires
            each of them and the card turns twice, which looks like nothing
            happening at all.
          -->
          <CardFace
            :card="current"
            :flipped="flipped"
            :flip-on-click="false"
            :intent="intent"
            size="lg"
            @edit="emit('edit', current)"
            @remove="emit('remove', current)"
            @rate="emit('rate', current, $event)"
          />
        </div>
      </div>

      <UTooltip :text="t('cards.next')">
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="outline"
          size="xl"
          class="shrink-0"
          :aria-label="t('cards.next')"
          @click="advance"
        />
      </UTooltip>
    </div>

    <div class="space-y-1 text-center">
      <p class="text-xs tabular-nums text-dimmed">
        {{ t('cards.position', { index: modelValue + 1, total: cards.length }) }}
      </p>
      <p class="text-xs text-dimmed">
        {{ t('stack.hint') }}
      </p>
    </div>
  </div>
</template>
