<script setup lang="ts">
import { partOfSpeechColour } from '#shared/constants/pos';
import type { Rating } from '#shared/constants/rating';
import type { CardRecord } from '#shared/types/card';

/**
 * The box, seen the way it sits on a desk.
 *
 * Cards stand on edge in a row, close enough to overlap, with only the spine of
 * each one showing: the word, and a coloured stripe for its part of speech. The
 * one you are on rises out of the box and opens.
 *
 * This is the browse view rather than a grid because a grid of flashcards is
 * just a table with rounded corners. Standing them up keeps the hanzi readable
 * at a glance, fits far more of them on a screen than a grid does, and makes
 * running along them feel like running a thumb down real card stock.
 */
const props = defineProps<{
  cards: CardRecord[];
  /** Index of the card standing proud of the others. */
  modelValue: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [index: number];
  'edit': [card: CardRecord];
  'remove': [card: CardRecord];
  'rate': [card: CardRecord, value: Rating];
}>();

const { t } = useI18n();

const rail = ref<HTMLElement | null>(null);
const flipped = ref(false);

const current = computed<CardRecord | null>(() => props.cards[props.modelValue] ?? null);

// A different card is a fresh card, so it always comes up face forward.
watch(
  () => props.modelValue,
  () => {
    flipped.value = false;
  }
);

function select(index: number) {
  emit('update:modelValue', index);
}

/** Keeps the selected spine in view when the keyboard moves the selection. */
watch(
  () => props.modelValue,
  async (index) => {
    await nextTick();
    rail.value?.querySelector<HTMLElement>(`[data-index="${index}"]`)?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });
  }
);

function step(delta: number) {
  const next = props.modelValue + delta;
  if (next >= 0 && next < props.cards.length) {
    select(next);
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    step(1);
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    step(-1);
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- The card pulled out of the box, open. -->
    <div v-if="current" class="mx-auto w-full max-w-sm">
      <CardFace
        v-model:flipped="flipped"
        :card="current"
        size="md"
        @edit="emit('edit', current)"
        @remove="emit('remove', current)"
        @rate="emit('rate', current, $event)"
      />
    </div>

    <!--
      The box itself. Spines overlap by a negative margin, so a hundred cards
      still fit in a couple of screens of scrolling, and the selected one lifts
      and separates from its neighbours.
    -->
    <div class="juka-box relative rounded-xl bg-elevated ring ring-default">
      <div
        ref="rail"
        class="no-scrollbar flex items-end gap-0 overflow-x-auto px-4 pt-8 pb-4"
        role="listbox"
        :aria-label="t('view.box')"
        tabindex="0"
        @keydown="onKeydown"
      >
        <button
          v-for="(card, index) in cards"
          :key="card.id"
          type="button"
          role="option"
          :data-index="index"
          :aria-selected="index === modelValue"
          :title="`${card.hanzi} ${card.pinyin}`"
          class="group relative shrink-0 rounded-t-md bg-default pt-3 pb-3 ring ring-default transition-[height,margin,width] duration-200"
          :class="index === modelValue ? 'z-10 -mt-5 h-44 w-20 ring-primary' : '-ml-1 h-32 w-11 first:ml-0 hover:h-36'"
          @click="select(index)"
        >
          <!-- The coloured edge is the part of speech, readable side on. -->
          <span
            class="absolute inset-x-0 top-0 h-1.5 rounded-t-md"
            :style="{ backgroundColor: partOfSpeechColour(card.pos) }"
          />

          <span
            class="font-hanzi leading-tight text-highlighted [writing-mode:vertical-rl]"
            :class="index === modelValue ? 'text-2xl' : 'text-base'"
            >{{ card.hanzi }}</span
          >

          <!-- The rating shows on the spine, so a weak card is visible unopened. -->
          <span
            v-if="card.rating > 0"
            class="absolute inset-x-0 bottom-1 text-center text-[10px] font-bold text-[var(--color-rating)] tabular-nums"
            >{{ card.rating }}</span
          >
        </button>
      </div>
    </div>

    <p v-if="current" class="text-center text-xs text-dimmed">
      {{ t('cards.position', { index: modelValue + 1, total: cards.length }) }}
    </p>
  </div>
</template>

<style scoped>
/*
  The front lip of the box. A gradient rather than a border, so the cards look
  like they are standing behind something rather than sitting on top of a line.
*/
.juka-box::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 1.5rem;
  border-radius: 0 0 0.75rem 0.75rem;
  background: linear-gradient(to top, var(--ui-bg-accented), transparent);
  pointer-events: none;
}
</style>
