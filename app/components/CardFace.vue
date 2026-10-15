<script setup lang="ts">
import { partOfSpeechColor } from '#shared/constants/pos';
import type { Rating } from '#shared/constants/rating';
import type { CardRecord, GroupRecord } from '#shared/types/card';
import { tonesOf } from '#shared/utils/pinyin';

/**
 * One card, front and back.
 *
 * The front is the word and nothing else, which is the whole point of a flashcard: you have to try before you turn it.
 * The back carries the reading, the meaning and the part of speech.
 *
 * **Only the content rotates.** The action bar and the rating sit outside the flipping element, pinned over it.
 * An earlier version put a copy of both inside each face, which meant they spun with the card and left eighteen buttons in the tab order for a card with nine controls.
 *
 * The proportions are a 3 by 5 index card, the shape a paper flashcard actually is, rather than whatever height the content happened to need.
 */
const props = withDefaults(
  defineProps<{
    card: CardRecord;
    flipped?: boolean;
    size?: 'sm' | 'md' | 'lg';
    /** Dimmed and inert, for the cards stacked behind the top one. */
    inert?: boolean;
    /** Whether clicking the card turns it. Off for a card being shown, not used. */
    flipOnClick?: boolean;
  }>(),
  {
    flipped: false,
    size: 'md',
    inert: false,
    flipOnClick: true
  }
);

const emit = defineEmits<{
  'update:flipped': [value: boolean];
  'edit': [];
  'remove': [];
  'rate': [value: Rating];
}>();

const { t, locale } = useI18n();
const toast = useToast();
const { speak, speaking } = useSpeech();
const { byId } = useGroups();
const { labelFor } = useRatingLabels();
const { style: cardStyle } = useCardStyle();

/** 3 by 5, the index card everyone already owns. */
/** The gallery card fills its grid column, so it grows with the screen; the grid caps it at four across. */
const widths = { sm: 'max-w-60', md: '', lg: 'max-w-[36rem]' };
/** One 田 square per character, smaller as the word gets longer so four still fit the card. */
const cellSizes = { sm: [64, 56, 46, 38], md: [120, 108, 88, 70], lg: [168, 150, 120, 96] };
const cellSize = computed(
  () => `${(cellSizes[props.size][Math.min([...props.card.hanzi].length, 4) - 1] ?? 0) * cardStyle.value.size}px`
);

/**
 * The usual teaching colors for the four tones and the neutral one, applied per character when the setting is on.
 * Off by default: color on the card is otherwise kept for the rating, and tones are a study aid someone chooses.
 */
const TONE_COLORS = { 1: '#d6322b', 2: '#e08a00', 3: '#2e9153', 4: '#2f6fd0', 5: 'var(--ui-text-muted)' } as const;

/** One entry per character: the character and, with tones on, its color. A reading that does not line up colors nothing. */
const characters = computed(() => {
  const chars = [...props.card.hanzi];
  const tones = cardStyle.value.tones ? tonesOf(props.card.pinyin) : [];
  const aligned = tones.length === chars.length;
  return chars.map((character, index) => ({
    character,
    color: aligned ? TONE_COLORS[tones[index] ?? 5] : undefined
  }));
});
/** The answer is the payoff of every turn, so it is sized like the word on the front rather than like a caption. */
const meaningSizes = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' };
const pinyinSizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };

/**
 * The meaning in the interface's language.
 *
 * Vietnamese comes from the bundled dictionary, pivoted through the English gloss.
 * Where the pivot found nothing the English stands, which is a worse card than a wrong one would be but an honest one.
 */
const meaning = computed(() => {
  if (locale.value === 'vi' && props.card.translationVi) {
    return props.card.translationVi;
  }
  return props.card.translation;
});

const posColor = computed(() => partOfSpeechColor(props.card.pos));

/*
 * The chrome is sized against the card it sits on.
 *
 * A 44px target is the floor for a control you hit with a thumb, and the icons were below it on every card.
 * They scale with the card rather than being one fixed size, so the stack, where the card is half the screen, gets buttons to match instead of the same specks the gallery uses.
 */
const chromeSizes = { sm: 'sm', md: 'md', lg: 'xl' } as const;
const ratingSizes = { sm: 'sm', md: 'md', lg: 'lg' } as const;

const cardGroups = computed(
  () => props.card.groupIds.map(byId).filter((group) => group !== undefined) as GroupRecord[]
);

/*
 * The chrome hides while the card is turning.
 *
 * Buttons pinned over a rotating surface read as floating loose above it, and a rating you can press mid-turn belongs to neither face.
 * They come back once the rotation settles, on the same 500ms the transform runs for.
 */
const turning = ref(false);
let settle: ReturnType<typeof setTimeout> | undefined;

watch(
  () => props.flipped,
  () => {
    turning.value = true;
    clearTimeout(settle);
    settle = setTimeout(() => {
      turning.value = false;
    }, 500);
  }
);

/*
 * The press dip: the card shrinks a little under the finger before it turns.
 * Released on a window listener rather than the element's own pointerup, so a press that ends anywhere else still lets the card back up.
 */
const pressed = ref(false);

function press() {
  if (!props.inert) {
    pressed.value = true;
  }
}

function release() {
  pressed.value = false;
}

onMounted(() => {
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
});

onBeforeUnmount(() => {
  clearTimeout(settle);
  window.removeEventListener('pointerup', release);
  window.removeEventListener('pointercancel', release);
});

async function copy() {
  try {
    await navigator.clipboard.writeText(props.card.hanzi);
    toast.add({ title: t('card.copied', { hanzi: props.card.hanzi }), icon: 'i-lucide-check' });
  } catch {
    // Denied permission, or an insecure origin.
    // Nothing was copied, so say so rather than showing a success that did not happen.
    toast.add({ title: t('card.notCopied'), icon: 'i-lucide-triangle-alert', color: 'error' });
  }
}
</script>

<template>
  <div
    class="group relative mx-auto w-full transition-transform duration-300 ease-out select-none perspective-[1600px]"
    :class="[
      widths[size],
      !inert && flipOnClick && 'cursor-pointer',
      // The card lifts toward the reader on hover, which is the other half of the shadow: without it the shadow grows under a card that has not moved.
      !inert && 'hover:-translate-y-0.5'
    ]"
    style="aspect-ratio: 5 / 3.2"
    @pointerdown="press"
  >
    <div
      class="relative size-full transition-transform duration-500 transform-3d"
      :class="[flipped && 'transform-[rotateY(180deg)]', pressed && 'scale-[0.97]']"
    >
      <!-- Front -->
      <div
        class="juka-card juka-front absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden px-6 pb-8 backface-hidden"
        :class="inert && 'opacity-60'"
      >
        <!--
          The word type as a folded corner rather than a stripe across the top: a stripe in five hues across a grid of cards was the loudest color on the page, louder than the seal and the rating.
          Clipped by the card's own overflow, so it follows the corner.
        -->
        <span class="juka-corner" :style="{ backgroundColor: posColor }" aria-hidden="true" />

        <p
          class="juka-hanzi flex"
          lang="zh"
          :data-grid="cardStyle.grid"
          :data-font="cardStyle.font"
          :style="{ '--cell': cellSize, '--n': Math.min([...card.hanzi].length, 4) }"
        >
          <span
            v-for="(entry, index) in characters"
            :key="index"
            class="juka-cell"
            :style="entry.color ? { color: entry.color } : undefined"
            >{{ entry.character }}</span
          >
        </p>

        <div v-if="cardGroups.length" class="inset-x-0 bottom-10 flex flex-wrap justify-center gap-1 px-4">
          <span
            v-for="group in cardGroups"
            :key="group.id"
            class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            :style="{
              color: `color-mix(in oklab, ${group.color} 55%, var(--ui-text-highlighted))`,
              backgroundColor: `color-mix(in oklab, ${group.color} 14%, transparent)`
            }"
            >{{ group.name }}</span
          >
        </div>
      </div>

      <!-- Back: the reading above, the meaning large, the word type as a quiet tag in the corner. -->
      <div
        class="juka-card absolute inset-0 flex transform-[rotateY(180deg)] flex-col items-center justify-center gap-1 overflow-hidden px-6 pb-6 text-center backface-hidden"
      >
        <span class="juka-corner" :style="{ backgroundColor: posColor }" aria-hidden="true" />
        <span
          v-if="card.pos && size !== 'sm'"
          class="absolute top-3 left-1/2 -translate-x-1/2 text-xs font-semibold tracking-wide text-muted"
          >{{ t(`pos.${card.pos}`) }}</span
        >

        <p class="text-muted" :class="pinyinSizes[size]">{{ card.pinyin }}</p>
        <p
          class="font-[family-name:var(--font-display)] leading-tight font-bold text-highlighted"
          :class="meaningSizes[size]"
        >
          {{ meaning || t('card.noTranslation') }}
        </p>
      </div>
    </div>

    <!-- The flip target: the whole card, under the chrome. -->
    <button
      v-if="!inert && flipOnClick"
      type="button"
      class="absolute inset-0 z-10 cursor-pointer rounded-2xl"
      :aria-label="t('card.turnOver')"
      :aria-pressed="flipped"
      @click="emit('update:flipped', !flipped)"
    />

    <!--
      Fixed chrome.
      Edit and delete top right, the way a card has a corner you annotate; copy top left; audio bottom right under the thumb.
    -->
    <div
      v-if="!inert"
      class="pointer-events-none absolute inset-0 z-20 transition-opacity duration-200"
      :class="turning ? 'opacity-0' : 'opacity-100'"
    >
      <div
        class="pointer-events-auto absolute top-2 left-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100"
      >
        <UTooltip :text="t('card.copy')">
          <UButton
            icon="i-lucide-copy"
            color="neutral"
            variant="ghost"
            :size="chromeSizes[size]"
            :aria-label="t('card.copy')"
            @pointerdown.stop
            @pointerup.stop
            @click.stop="copy"
          />
        </UTooltip>
      </div>

      <div
        class="pointer-events-auto absolute top-2 right-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100"
      >
        <UTooltip :text="t('card.edit')">
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            :size="chromeSizes[size]"
            :aria-label="t('card.edit')"
            @pointerdown.stop
            @pointerup.stop
            @click.stop="emit('edit')"
          />
        </UTooltip>
        <UTooltip :text="t('common.delete')">
          <UButton
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            :size="chromeSizes[size]"
            :aria-label="t('common.delete')"
            @pointerdown.stop
            @pointerup.stop
            @click.stop="emit('remove')"
          />
        </UTooltip>
      </div>

      <!-- The level in words, so the mandarins are never the only way to read it. -->
      <span v-if="size !== 'sm'" class="absolute bottom-3 left-3 text-xs text-muted first-letter:uppercase">
        {{ card.rating ? labelFor(card.rating) : t('filter.unrated') }}
      </span>

      <div class="pointer-events-auto absolute inset-x-0 bottom-2 flex justify-center">
        <CardRating :model-value="card.rating" :size="ratingSizes[size]" @update:model-value="emit('rate', $event)" />
      </div>

      <div class="pointer-events-auto absolute right-2 bottom-2">
        <UTooltip :text="t('card.listen')">
          <UButton
            icon="i-lucide-volume-2"
            color="neutral"
            variant="ghost"
            :size="chromeSizes[size]"
            :class="speaking && 'text-primary'"
            :aria-label="t('card.listen')"
            @pointerdown.stop
            @pointerup.stop
            @click.stop="speak(card.hanzi)"
          />
        </UTooltip>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  Card stock, not a panel. overflow-hidden on the faces is what keeps the colored part-of-speech edge inside the corner radius instead of squaring off the top of the card.
*/
.juka-card {
  background-color: var(--ui-bg);
  border-radius: 0.25rem;
  /* Soft ink bleeding into the paper rather than a drawn edge. */
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--ui-text) 8%, transparent),
    0 2px 6px -2px color-mix(in oklab, var(--ui-text) 10%, transparent),
    0 12px 28px -14px color-mix(in oklab, var(--ui-text) 22%, transparent);
  transition: box-shadow 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.group:hover .juka-card {
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--ui-text) 10%, transparent),
    0 4px 10px -4px color-mix(in oklab, var(--ui-text) 12%, transparent),
    0 20px 40px -18px color-mix(in oklab, var(--ui-text) 28%, transparent);
}

/*
  The hanzi is a thing to read and copy, not to drag-select.
  Selecting it by accident while swiping the card is the common case, and the copy button is the deliberate one.
*/
.juka-hanzi {
  user-select: none;
  -webkit-user-select: none;
}
</style>
