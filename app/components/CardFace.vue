<script setup lang="ts">
import { partOfSpeechColour } from '#shared/constants/pos'
import type { Rating } from '#shared/constants/rating'
import type { CardRecord, GroupRecord } from '#shared/types/card'

/**
 * One card, front and back.
 *
 * The front is the word and nothing else, which is the whole point of a
 * flashcard: you have to try before you turn it. The back carries the reading,
 * the meaning and the part of speech.
 *
 * **Only the content rotates.** The action bar and the rating sit outside the
 * flipping element, pinned over it. An earlier version put a copy of both
 * inside each face, which meant they spun with the card and left eighteen
 * buttons in the tab order for a card with nine controls.
 *
 * The proportions are a 3 by 5 index card, the shape a paper flashcard actually
 * is, rather than whatever height the content happened to need.
 */
const props = withDefaults(defineProps<{
  card: CardRecord
  flipped?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Dimmed and inert, for the cards stacked behind the top one. */
  inert?: boolean
  /**
   * Whether clicking the card turns it.
   *
   * False in the stack view, where a drag gesture already decides what a
   * release means and a second handler here would turn it straight back.
   */
  flipOnClick?: boolean
  /**
   * -1 to 1, how far a drag has gone toward binning or keeping.
   *
   * The card itself shows the outcome: it goes red as it moves left and lifts
   * as it moves right. An earlier version floated two chips over the card
   * instead, which covered the word you were deciding about.
   */
  intent?: number
}>(), {
  flipped: false,
  size: 'md',
  inert: false,
  flipOnClick: true,
  intent: 0
})

const emit = defineEmits<{
  'update:flipped': [value: boolean]
  'edit': []
  'remove': []
  'rate': [value: Rating]
}>()

const { t, locale } = useI18n()
const toast = useToast()
const { speak, speaking } = useSpeech()
const { byId } = useGroups()

/** 3 by 5, the index card everyone already owns. */
const widths = { sm: 'max-w-[15rem]', md: 'max-w-[20rem]', lg: 'max-w-[26rem]' }
const hanziSizes = { sm: 'text-5xl', md: 'text-7xl', lg: 'text-8xl sm:text-9xl' }
const meaningSizes = { sm: 'text-base', md: 'text-xl', lg: 'text-2xl' }

/**
 * The meaning in the interface's language.
 *
 * Vietnamese comes from the bundled dictionary, pivoted through the English
 * gloss. Where the pivot found nothing the English stands, which is a worse
 * card than a wrong one would be but an honest one.
 */
const meaning = computed(() => {
  if (locale.value === 'vi' && props.card.translationVi) {
    return props.card.translationVi
  }
  return props.card.translation
})

const posColour = computed(() => partOfSpeechColour(props.card.pos))

const cardGroups = computed(() =>
  props.card.groupIds
    .map(byId)
    .filter(group => group !== undefined) as GroupRecord[]
)

/*
 * The chrome hides while the card is turning.
 *
 * Buttons pinned over a rotating surface read as floating loose above it, and
 * a rating you can press mid-turn belongs to neither face. They come back once
 * the rotation settles, on the same 500ms the transform runs for.
 */
const turning = ref(false)
let settle: ReturnType<typeof setTimeout> | undefined

watch(() => props.flipped, () => {
  turning.value = true
  clearTimeout(settle)
  settle = setTimeout(() => {
    turning.value = false
  }, 500)
})

/*
 * The press dip. Released on a window listener rather than the element's own
 * pointerup, because the stack view captures the pointer on its drag wrapper
 * and the element never sees the release.
 */
const pressed = ref(false)

function press() {
  if (!props.inert) {
    pressed.value = true
  }
}

function release() {
  pressed.value = false
}

onMounted(() => {
  window.addEventListener('pointerup', release)
  window.addEventListener('pointercancel', release)
})

onBeforeUnmount(() => {
  clearTimeout(settle)
  window.removeEventListener('pointerup', release)
  window.removeEventListener('pointercancel', release)
})

async function copy() {
  try {
    await navigator.clipboard.writeText(props.card.hanzi)
    toast.add({ title: t('card.copied', { hanzi: props.card.hanzi }), icon: 'i-lucide-check' })
  }
  catch {
    // Denied permission, or an insecure origin. Nothing was copied, so say so
    // rather than showing a success that did not happen.
    toast.add({ title: t('card.notCopied'), icon: 'i-lucide-triangle-alert', color: 'error' })
  }
}

/** How red the card goes as it moves toward the bin. */
const binning = computed(() => Math.max(0, -props.intent))
</script>

<template>
  <div
    class="group relative mx-auto w-full select-none [perspective:1600px]"
    :class="widths[size]"
    style="aspect-ratio: 5 / 3.2"
    @pointerdown="press"
  >
    <div
      class="relative size-full transition-transform duration-500 [transform-style:preserve-3d]"
      :class="[
        flipped && '[transform:rotateY(180deg)]',
        pressed && 'scale-[0.97]'
      ]"
    >
      <!-- Front -->
      <div
        class="juka-card absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-6 [backface-visibility:hidden]"
        :class="inert && 'opacity-60'"
      >
        <!-- Clipped by the card's own overflow, so it follows the corner. -->
        <span
          class="absolute inset-x-0 top-0 h-1"
          :style="{ backgroundColor: posColour }"
        />

        <p
          class="juka-hanzi font-hanzi leading-none text-highlighted"
          :class="hanziSizes[size]"
        >
          {{ card.hanzi }}
        </p>

        <div
          v-if="cardGroups.length"
          class="absolute inset-x-0 bottom-10 flex flex-wrap justify-center gap-1 px-4"
        >
          <span
            v-for="group in cardGroups"
            :key="group.id"
            class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            :style="{
              color: group.colour,
              backgroundColor: `color-mix(in oklab, ${group.colour} 14%, transparent)`
            }"
          >{{ group.name }}</span>
        </div>

        <!-- The bin wash, on the card rather than over it. -->
        <span
          class="pointer-events-none absolute inset-0 bg-error"
          :style="{ opacity: binning * 0.35 }"
        />
      </div>

      <!-- Back -->
      <div
        class="juka-card absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden px-6 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]"
      >
        <span
          class="absolute inset-x-0 top-0 h-1"
          :style="{ backgroundColor: posColour }"
        />

        <p
          class="font-medium text-muted"
          :class="size === 'sm' ? 'text-base' : 'text-xl'"
        >
          {{ card.pinyin }}
        </p>

        <p
          class="font-semibold text-highlighted"
          :class="meaningSizes[size]"
        >
          {{ meaning || t('card.noTranslation') }}
        </p>

        <span
          v-if="card.pos"
          class="rounded-full px-2 py-0.5 text-xs font-semibold"
          :style="{
            color: posColour,
            backgroundColor: `color-mix(in oklab, ${posColour} 14%, transparent)`
          }"
        >{{ t(`pos.${card.pos}`) }}</span>

        <span
          class="pointer-events-none absolute inset-0 bg-error"
          :style="{ opacity: binning * 0.35 }"
        />
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
      Fixed chrome. Edit and delete top right, the way a card has a corner you
      annotate; copy top left; audio bottom right under the thumb.
    -->
    <div
      v-if="!inert"
      class="pointer-events-none absolute inset-0 z-20 transition-opacity duration-200"
      :class="turning ? 'opacity-0' : 'opacity-100'"
    >
      <div
        class="pointer-events-auto absolute left-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
      >
        <UTooltip :text="t('card.copy')">
          <UButton
            icon="i-lucide-copy"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="t('card.copy')"
            @pointerdown.stop
            @click.stop="copy"
          />
        </UTooltip>
      </div>

      <div
        class="pointer-events-auto absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
      >
        <UTooltip :text="t('card.edit')">
          <UButton
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="t('card.edit')"
            @pointerdown.stop
            @click.stop="emit('edit')"
          />
        </UTooltip>
        <UTooltip :text="t('common.delete')">
          <UButton
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="t('common.delete')"
            @pointerdown.stop
            @click.stop="emit('remove')"
          />
        </UTooltip>
      </div>

      <div class="pointer-events-auto absolute bottom-2 right-2">
        <UTooltip :text="t('card.listen')">
          <UButton
            icon="i-lucide-volume-2"
            color="neutral"
            variant="ghost"
            size="xs"
            :class="speaking && 'text-primary'"
            :aria-label="t('card.listen')"
            @pointerdown.stop
            @click.stop="speak(card.hanzi)"
          />
        </UTooltip>
      </div>

      <div class="pointer-events-auto absolute inset-x-0 bottom-2 flex justify-center">
        <CardRating
          :model-value="card.rating"
          :size="size === 'sm' ? 'sm' : 'md'"
          @update:model-value="emit('rate', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
  Card stock, not a panel. overflow-hidden on the faces is what keeps the
  coloured part-of-speech edge inside the corner radius instead of squaring off
  the top of the card.
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
  The hanzi is a thing to read and copy, not to drag-select. Selecting it by
  accident while swiping the card is the common case, and the copy button is
  the deliberate one.
*/
.juka-hanzi {
  user-select: none;
  -webkit-user-select: none;
}
</style>
