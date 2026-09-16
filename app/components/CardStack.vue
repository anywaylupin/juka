<script setup lang="ts">
import { partOfSpeechColour } from '#shared/constants/pos';
import type { Rating } from '#shared/constants/rating';
import type { CardRecord } from '#shared/types/card';

/**
 * One card at a time, as a deck you step through.
 *
 * The cards to come stand behind the top one and peek out above it, each a little narrower and each showing the colour of its own part of speech, so the deck reads as a stack of real cards and you can see there is more to come without counting.
 * Stepping forward deals the top card away and brings the next one up through the deck.
 *
 * **There is no swipe.** Dragging a card left to delete it was removed: it put the one destructive action in the app on the easiest gesture to perform by accident, and it fought the tap that turns a card over.
 * Forward, back and turn over are buttons and keys now, and deleting is the same button it is everywhere else.
 *
 * The order comes from usePracticeOrder, which deals weakly known cards more often.
 * That is the only place in the app where a rating decides what comes next, and it is confined to this view.
 */
const props = defineProps<{
  cards: CardRecord[];
  modelValue: number;
  /** True when the deck is weighted toward the cards you know least. */
  practice: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [index: number];
  'update:practice': [value: boolean];
  'reshuffle': [];
  'edit': [card: CardRecord];
  'remove': [card: CardRecord];
  'rate': [card: CardRecord, value: Rating];
}>();

const { t } = useI18n();

const flipped = ref(false);

const current = computed<CardRecord | null>(() => props.cards[props.modelValue] ?? null);

/** The two behind, for depth. Wraps, so the deck never looks like it ran out. */
const behind = computed(() =>
  [1, 2]
    .map((offset) => props.cards[(props.modelValue + offset) % props.cards.length])
    .filter((card): card is CardRecord => Boolean(card) && props.cards.length > 1)
);

/**
 * Which way the deck is moving, so the animation matches the button.
 *
 * Forward deals the card away upward and the next one rises into its place; back reverses it.
 * Without this both directions look identical and the deck stops feeling like a physical thing.
 */
const direction = ref<'forward' | 'back'>('forward');

watch(
  () => props.modelValue,
  () => {
    flipped.value = false;
  }
);

function advance() {
  if (props.cards.length === 0) {
    return;
  }
  direction.value = 'forward';
  emit('update:modelValue', (props.modelValue + 1) % props.cards.length);
}

function back() {
  if (props.cards.length === 0) {
    return;
  }
  direction.value = 'back';
  emit('update:modelValue', (props.modelValue - 1 + props.cards.length) % props.cards.length);
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, textarea, [contenteditable]')) {
    return;
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault();
    advance();
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    back();
  }
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    flipped.value = !flipped.value;
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div v-if="current" class="space-y-5">
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

      <UTooltip v-if="practice" :text="t('stack.reshuffle')">
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
      The deck.
      Cards to come sit behind and above, so the top of each one shows as a coloured edge the way a stack of index cards does on a desk.
    -->
    <div class="mx-auto w-full max-w-[26rem] px-1 pt-7">
      <div class="relative">
        <div
          v-for="(card, depth) in behind"
          :key="card.id"
          class="juka-deck-edge pointer-events-none absolute inset-x-0 top-0"
          :style="{
            transform: `translateY(${-(depth + 1) * 13}px) scale(${1 - (depth + 1) * 0.055})`,
            backgroundColor: partOfSpeechColour(card.pos),
            // Further back reads as further away, so two cards of the same word type still show as two edges rather than one thick band.
            opacity: 1 - depth * 0.35,
            zIndex: 2 - depth
          }"
          aria-hidden="true"
        />

        <Transition :name="direction === 'forward' ? 'juka-deal' : 'juka-deal-back'">
          <CardFace
            :key="current.id"
            v-model:flipped="flipped"
            :card="current"
            size="lg"
            class="relative z-10"
            @edit="emit('edit', current)"
            @remove="emit('remove', current)"
            @rate="emit('rate', current, $event)"
          />
        </Transition>
      </div>
    </div>

    <!--
      The arrows sit under the deck, centred, where a thumb rests.
      They were beside the card while a swipe still existed and the card could move sideways under them; now that stepping is the only way through, they belong together.
    -->
    <div class="flex items-center justify-center gap-3">
      <UTooltip :text="t('cards.previous')">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="soft"
          size="xl"
          class="rounded-full transition-transform duration-150 active:scale-90"
          :aria-label="t('cards.previous')"
          @click="back"
        />
      </UTooltip>

      <p class="min-w-16 text-center text-xs text-dimmed tabular-nums">
        {{ t('cards.position', { index: modelValue + 1, total: cards.length }) }}
      </p>

      <UTooltip :text="t('cards.next')">
        <UButton
          icon="i-lucide-arrow-right"
          color="neutral"
          variant="soft"
          size="xl"
          class="rounded-full transition-transform duration-150 active:scale-90"
          :aria-label="t('cards.next')"
          @click="advance"
        />
      </UTooltip>
    </div>

    <p class="text-center text-xs text-dimmed">
      {{ t('stack.hint') }}
    </p>
  </div>
</template>

<style scoped>
/*
  A card edge is only ever seen as a band above the card in front of it, so it is drawn as a rounded block the height of the card rather than as a whole card: there is nothing on the part that shows except its colour.
*/
.juka-deck-edge {
  aspect-ratio: 5 / 3.2;
  border-radius: 1rem;
  transform-origin: top center;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
