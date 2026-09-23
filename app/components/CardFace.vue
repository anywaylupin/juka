<script setup lang="ts">
import { partOfSpeechColor } from '#shared/constants/pos';
import type { Rating } from '#shared/constants/rating';
import type { CardRecord, GroupRecord } from '#shared/types/card';

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

/** 3 by 5, the index card everyone already owns. */
const widths = { sm: 'max-w-60', md: 'max-w-[20rem]', lg: 'max-w-104' };
/**
 * Hanzi size by card size and word length.
 * One size for every word wrapped 面条儿 onto two lines on the stack card, so longer words step down instead.
 */
const hanziSizes = {
  sm: ['text-5xl', 'text-5xl', 'text-4xl', 'text-3xl'],
  md: ['text-7xl', 'text-7xl', 'text-6xl', 'text-5xl'],
  lg: ['text-8xl sm:text-9xl', 'text-8xl sm:text-9xl', 'text-7xl sm:text-8xl', 'text-6xl sm:text-7xl']
};
const hanziSize = computed(() => hanziSizes[props.size][Math.min([...props.card.hanzi].length, 4) - 1]);
const meaningSizes = { sm: 'text-base', md: 'text-xl', lg: 'text-2xl' };

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
        class="juka-card absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden px-6 backface-hidden"
        :class="inert && 'opacity-60'"
      >
        <!-- Clipped by the card's own overflow, so it follows the corner. -->
        <span class="absolute inset-x-0 top-0 h-1" :style="{ backgroundColor: posColor }" />

        <p class="juka-hanzi font-hanzi leading-none whitespace-nowrap text-highlighted" :class="hanziSize">
          {{ card.hanzi }}
        </p>

        <div v-if="cardGroups.length" class="inset-x-0 bottom-10 flex flex-wrap justify-center gap-1 px-4">
          <span
            v-for="group in cardGroups"
            :key="group.id"
            class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            :style="{
              color: group.color,
              backgroundColor: `color-mix(in oklab, ${group.color} 14%, transparent)`
            }"
            >{{ group.name }}</span
          >
        </div>
      </div>

      <!-- Back -->
      <div
        class="juka-card absolute inset-0 flex transform-[rotateY(180deg)] flex-col items-center justify-center gap-2 overflow-hidden px-6 text-center backface-hidden"
      >
        <span class="absolute inset-x-0 top-0 h-1" :style="{ backgroundColor: posColor }" />

        <div class="flex items-center gap-2">
          <p class="font-medium text-muted" :class="size === 'sm' ? 'text-base' : 'text-xl'">
            {{ card.pinyin }}
          </p>
          <span
            v-if="card.pos"
            class="rounded-full px-2 py-0.5 text-xs font-semibold"
            :style="{
              color: posColor,
              backgroundColor: `color-mix(in oklab, ${posColor} 14%, transparent)`
            }"
            >{{ t(`pos.${card.pos}`) }}</span
          >
        </div>

        <p class="font-semibold text-highlighted" :class="meaningSizes[size]">
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
  border-radius: 1rem;
  box-shadow:
    0 1px 2px color-mix(in oklab, var(--ui-text) 6%, transparent),
    0 4px 10px -6px color-mix(in oklab, var(--ui-text) 18%, transparent),
    inset 0 0 0 1px var(--ui-border);
  transition: box-shadow 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.group:hover .juka-card {
  box-shadow:
    0 2px 4px color-mix(in oklab, var(--ui-text) 8%, transparent),
    0 18px 36px -14px color-mix(in oklab, var(--ui-text) 28%, transparent),
    inset 0 0 0 1px var(--ui-border-accented);
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
