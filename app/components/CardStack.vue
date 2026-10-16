<script setup lang="ts">
import type { Rating } from '#shared/constants/rating';
import type { CardRecord } from '#shared/types/card';

/**
 * One card at a time, as a deck you step through.
 *
 * The cards to come stand behind the top one and peek out above it, each a little narrower and a shade of ink deeper, so the deck reads as a stack of real cards and you can see there is more to come without counting.
 * They were colored by word type once; that put a third hue above every card, and color is kept for the seal and the rating now.
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

const orderTabs = computed(() => [
  { label: t('stack.weighted'), value: 'weighted', icon: 'i-lucide-shuffle' },
  { label: t('stack.inOrder'), value: 'box', icon: 'i-lucide-list-ordered' }
]);

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
const direction = ref<'forward' | 'back' | null>(null);

/**
 * The deal plays only for a step the user took.
 * The order changes on its own while the box loads and the practice shuffle runs, and animating each of those dealt through half the deck on page load.
 */
const dealName = computed(() =>
  direction.value === 'forward' ? 'juka-deal' : direction.value === 'back' ? 'juka-deal-back' : 'juka-none'
);

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
  <!--
    A practice session laid out like a desk: how the deck is dealt and where you are in it along the top, the deck in the middle as large as the table allows with a step either side of it, and the keys underneath.
    The earlier version stacked a pill, a small card, two round arrows, a "1 of 8" and a sentence of instructions down the center line, every piece the same small size, which read as generated rather than designed.
  -->
  <div v-if="current" class="flex flex-col gap-4 lg:h-full lg:min-h-0">
    <div class="flex flex-wrap items-center gap-3">
      <UTabs
        :items="orderTabs"
        :model-value="practice ? 'weighted' : 'box'"
        variant="pill"
        color="neutral"
        size="sm"
        :content="false"
        class="w-full sm:w-80"
        :aria-label="t('stack.order')"
        @update:model-value="emit('update:practice', $event === 'weighted')"
      />
      <UButton
        v-if="practice"
        icon="i-lucide-rotate-cw"
        color="neutral"
        variant="ghost"
        :aria-label="t('stack.reshuffle')"
        @click="emit('reshuffle')"
      >
        <span class="hidden sm:inline">{{ t('stack.reshuffle') }}</span>
      </UButton>

      <p class="ml-auto font-display text-highlighted tabular-nums" aria-live="polite">
        <span class="text-2xl font-bold">{{ modelValue + 1 }}</span>
        <span class="text-muted"> / {{ cards.length }}</span>
      </p>
    </div>

    <div class="flex flex-1 items-center gap-3 lg:min-h-0 lg:gap-6">
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="outline"
        size="xl"
        class="hidden shrink-0 sm:flex"
        :aria-label="t('cards.previous')"
        @click="back"
      />

      <!--
        The stage is a size container, so the deck takes the largest index card that fits the table, leaving room above for the edges of the cards to come.
        Cards to come sit behind and above in ink, the way a stack of index cards shows its edges on a desk.
      -->
      <div data-stage class="flex-1 self-stretch">
        <div data-deck class="relative mx-auto">
          <div
            v-for="(card, depth) in behind"
            :key="card.id"
            data-edge
            class="pointer-events-none absolute inset-x-0 top-0"
            :style="{
              transform: `translateY(${-(depth + 1) * 13}px) scale(${1 - (depth + 1) * 0.04})`,
              backgroundColor: `color-mix(in oklab, var(--ui-text) ${depth === 0 ? 14 : 8}%, var(--ui-bg))`,
              zIndex: 2 - depth
            }"
            aria-hidden="true"
          />

          <Transition :name="dealName" :css="direction !== null" @after-enter="direction = null">
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

      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="outline"
        size="xl"
        class="hidden shrink-0 sm:flex"
        :aria-label="t('cards.next')"
        @click="advance"
      />
    </div>

    <div class="shrink-0 space-y-3">
      <!-- How far through the deck, as a hairline of ink rather than a second counter. -->
      <UProgress :model-value="modelValue + 1" :max="cards.length" color="neutral" size="2xs" aria-hidden="true" />

      <!-- On a phone the arrows sit here, under the thumb; on a keyboard the keys are shown as keys. -->
      <div class="flex items-center justify-center gap-3 sm:hidden">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="outline"
          size="xl"
          :aria-label="t('cards.previous')"
          @click="back"
        />
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="outline"
          size="xl"
          :aria-label="t('cards.next')"
          @click="advance"
        />
      </div>
      <p class="hidden items-center justify-center gap-5 text-xs text-muted sm:flex">
        <span class="flex items-center gap-1.5"><UKbd value="←" />{{ t('stack.keyBack') }}</span>
        <span class="flex items-center gap-1.5"><UKbd value="Space" />{{ t('stack.keyTurn') }}</span>
        <span class="flex items-center gap-1.5"><UKbd value="→" />{{ t('stack.keyNext') }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
/*
  A card edge is only ever seen as a band above the card in front of it, so it is drawn as a rounded block the height of the card rather than as a whole card: there is nothing on the part that shows except its color.
*/
[data-edge] {
  aspect-ratio: 5 / 3.2;
  /* The card's own radius, so the deck reads as a stack of the same cards rather than tabs sticking out behind one. */
  border-radius: 0.25rem;
  transform-origin: top center;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}
/*
  The deck takes the largest index card that fits the stage, leaving 2rem above it for the edges of the cards behind.
  Capped at 44rem so a very wide screen does not turn one card into a billboard; on a phone it is simply the width of the screen.
*/
[data-deck] {
  width: 100%;
  max-width: 44rem;
  padding-top: 2rem;
}
@media (min-width: 64rem) {
  [data-stage] {
    container-type: size;
    display: grid;
    place-items: center;
    min-height: 0;
  }
  [data-deck] {
    width: min(100cqw, (100cqh - 2rem) * 5 / 3.2, 44rem);
  }
}
</style>
