<script setup lang="ts">
import { PART_OF_SPEECH_LIST, partOfSpeechColour, type PartOfSpeech } from '#shared/constants/pos';
import { RATING_ICON, RATING_VALUES, type Rating } from '#shared/constants/rating';
import type { CardRecord, GroupRecord } from '#shared/types/card';
import type { CardFilters } from '~/composables/useCardFilters';

/**
 * Filters, in named groups rather than one long rail of chips.
 *
 * Four groups, because there are four questions worth asking of a box of
 * flashcards: how well do I know it, what kind of word is it, how long is it,
 * and which of my own piles is it in. Each group is independent and
 * multi-select, and each carries its own clear, so narrowing down never means
 * starting over.
 *
 * Counts are shown per option, so a filter that would empty the box says so
 * before it is pressed.
 */
const props = defineProps<{
  filters: CardFilters;
  /** Everything in the box, for the per-option counts. */
  cards: CardRecord[];
  groups: GroupRecord[];
}>();

const emit = defineEmits<{
  toggleRating: [value: Rating];
  togglePart: [value: PartOfSpeech];
  toggleLength: [value: number];
  toggleGroup: [value: number];
  clearGroup: [group: 'ratings' | 'parts' | 'lengths' | 'groups'];
  clearAll: [];
  manageGroups: [];
}>();

const { t } = useI18n();
const { labelFor } = useRatingLabels();

const ratingCounts = computed(() => {
  const counts = new Map<Rating, number>();
  for (const card of props.cards) {
    counts.set(card.rating, (counts.get(card.rating) ?? 0) + 1);
  }
  return counts;
});

const partCounts = computed(() => {
  const counts = new Map<PartOfSpeech, number>();
  for (const card of props.cards) {
    if (card.pos) {
      counts.set(card.pos, (counts.get(card.pos) ?? 0) + 1);
    }
  }
  return counts;
});

const lengthCounts = computed(() => {
  const counts = new Map<number, number>();
  for (const card of props.cards) {
    const bucket = card.syllables >= 4 ? 4 : card.syllables;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return counts;
});

/** Only the parts of speech actually present, so the list is never dead weight. */
const availableParts = computed(() => PART_OF_SPEECH_LIST.filter((part) => (partCounts.value.get(part) ?? 0) > 0));

const lengths = [1, 2, 3, 4];
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-2">
      <header class="flex items-center justify-between gap-2">
        <h3 class="text-xs font-semibold tracking-wide text-dimmed uppercase">
          {{ t('filter.rating') }}
        </h3>
        <UButton
          v-if="filters.ratings.length"
          color="neutral"
          variant="link"
          size="xs"
          @click="emit('clearGroup', 'ratings')"
        >
          {{ t('filter.clear') }}
        </UButton>
      </header>

      <!-- Named, not numbered. "hesitant" is the word you would actually use. -->
      <div class="flex flex-wrap gap-1.5">
        <UButton
          v-for="value in RATING_VALUES"
          :key="`rating-${value}`"
          :icon="RATING_ICON"
          size="sm"
          :color="filters.ratings.includes(value) ? 'primary' : 'neutral'"
          :variant="filters.ratings.includes(value) ? 'solid' : 'outline'"
          :disabled="!(ratingCounts.get(value) ?? 0)"
          :aria-pressed="filters.ratings.includes(value)"
          @click="emit('toggleRating', value)"
        >
          {{ labelFor(value) }}
          <span class="text-xs opacity-60">{{ ratingCounts.get(value) ?? 0 }}</span>
        </UButton>

        <UButton
          size="sm"
          :color="filters.ratings.includes(0) ? 'primary' : 'neutral'"
          :variant="filters.ratings.includes(0) ? 'solid' : 'outline'"
          :disabled="!(ratingCounts.get(0) ?? 0)"
          :aria-pressed="filters.ratings.includes(0)"
          @click="emit('toggleRating', 0)"
        >
          {{ t('filter.unrated') }}
          <span class="text-xs opacity-60">{{ ratingCounts.get(0) ?? 0 }}</span>
        </UButton>
      </div>
    </section>

    <section class="space-y-2">
      <header class="flex items-center justify-between gap-2">
        <h3 class="text-xs font-semibold tracking-wide text-dimmed uppercase">
          {{ t('filter.group') }}
        </h3>
        <div class="flex items-center gap-1">
          <UButton
            v-if="filters.groups.length"
            color="neutral"
            variant="link"
            size="xs"
            @click="emit('clearGroup', 'groups')"
          >
            {{ t('filter.clear') }}
          </UButton>
          <UButton
            icon="i-lucide-settings-2"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="t('group.manage')"
            @click="emit('manageGroups')"
          />
        </div>
      </header>

      <p v-if="groups.length === 0" class="text-xs text-muted">
        {{ t('group.none') }}
      </p>

      <div v-else class="flex flex-wrap gap-1.5">
        <button
          v-for="group in groups"
          :key="group.id"
          type="button"
          class="rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-150"
          :aria-pressed="filters.groups.includes(group.id)"
          :style="
            filters.groups.includes(group.id)
              ? { backgroundColor: group.colour, color: '#fff' }
              : {
                  color: group.colour,
                  backgroundColor: `color-mix(in oklab, ${group.colour} 12%, transparent)`
                }
          "
          @click="emit('toggleGroup', group.id)"
        >
          {{ group.name }}
          <span class="ml-1 opacity-60">{{ group.count ?? 0 }}</span>
        </button>
      </div>
    </section>

    <section v-if="availableParts.length" class="space-y-2">
      <header class="flex items-center justify-between gap-2">
        <h3 class="text-xs font-semibold tracking-wide text-dimmed uppercase">
          {{ t('filter.type') }}
        </h3>
        <UButton
          v-if="filters.parts.length"
          color="neutral"
          variant="link"
          size="xs"
          @click="emit('clearGroup', 'parts')"
        >
          {{ t('filter.clear') }}
        </UButton>
      </header>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="part in availableParts"
          :key="part"
          type="button"
          class="rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-150"
          :aria-pressed="filters.parts.includes(part)"
          :style="
            filters.parts.includes(part)
              ? { backgroundColor: partOfSpeechColour(part), color: '#fff' }
              : {
                  color: partOfSpeechColour(part),
                  backgroundColor: `color-mix(in oklab, ${partOfSpeechColour(part)} 12%, transparent)`
                }
          "
          @click="emit('togglePart', part)"
        >
          {{ t(`pos.${part}`) }}
          <span class="ml-1 opacity-60">{{ partCounts.get(part) ?? 0 }}</span>
        </button>
      </div>
    </section>

    <section class="space-y-2">
      <header class="flex items-center justify-between gap-2">
        <h3 class="text-xs font-semibold tracking-wide text-dimmed uppercase">
          {{ t('filter.length') }}
        </h3>
        <UButton
          v-if="filters.lengths.length"
          color="neutral"
          variant="link"
          size="xs"
          @click="emit('clearGroup', 'lengths')"
        >
          {{ t('filter.clear') }}
        </UButton>
      </header>

      <div class="flex flex-wrap gap-1.5">
        <UButton
          v-for="length in lengths"
          :key="`length-${length}`"
          size="sm"
          :color="filters.lengths.includes(length) ? 'primary' : 'neutral'"
          :variant="filters.lengths.includes(length) ? 'solid' : 'outline'"
          :disabled="!(lengthCounts.get(length) ?? 0)"
          :aria-pressed="filters.lengths.includes(length)"
          @click="emit('toggleLength', length)"
        >
          {{ length === 4 ? '4+' : length }}字
          <span class="text-xs opacity-60">{{ lengthCounts.get(length) ?? 0 }}</span>
        </UButton>
      </div>
    </section>

    <UButton color="neutral" variant="soft" block icon="i-lucide-filter-x" @click="emit('clearAll')">
      {{ t('filter.clearAll') }}
    </UButton>
  </div>
</template>
