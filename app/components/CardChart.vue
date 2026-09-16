<script setup lang="ts">
import { partOfSpeechColour } from '#shared/constants/pos';
import { RATING_COLOUR, RATING_VALUES, type Rating } from '#shared/constants/rating';
import type { CardRecord, GroupRecord } from '#shared/types/card';

/**
 * What the box looks like from above.
 *
 * Three questions, in the order they are worth asking: how well do I know it, am I actually keeping it up, and what is in it.
 *
 * Built from divs rather than SVG or a charting library.
 * Everything here is a proportion or a count, which a flex row and a grid draw perfectly well, and it means no dependency, no canvas, and text that is selectable and readable by a screen reader.
 */
const props = defineProps<{
  cards: CardRecord[];
  groups: GroupRecord[];
}>();

const { t, locale } = useI18n();
const { labelFor } = useRatingLabels();

/* ---- Ripeness: the distribution across the five levels ---- */

const byRating = computed(() => {
  const counts = new Map<number, number>();
  for (const card of props.cards) {
    counts.set(card.rating, (counts.get(card.rating) ?? 0) + 1);
  }

  /*
   * One hue at five strengths rather than five hues.
   * The rating colour is fixed across every theme precisely so a rating is never mistaken for a button, and inventing a five colour ramp here would undo that.
   * More colour means more of the thing.
   */
  return [0, ...RATING_VALUES].map((rating) => ({
    rating: rating as Rating,
    label: rating === 0 ? t('filter.unrated') : labelFor(rating as Rating),
    count: counts.get(rating) ?? 0,
    colour: rating === 0 ? 'var(--ui-bg-accented)' : RATING_COLOUR,
    opacity: rating === 0 ? 1 : 0.25 + (rating / 5) * 0.75
  }));
});

const known = computed(() => props.cards.filter((card) => card.rating >= 4).length);

/* ---- Habit: cards added per day, over the last fifteen weeks ---- */

const WEEKS = 15;

const calendar = computed(() => {
  const counts = new Map<string, number>();

  for (const card of props.cards) {
    const key = card.createdAt.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  // Back to the most recent Sunday, so every column is a whole week.
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() - end.getDay() + 6);

  const weeks: Array<Array<{ key: string; count: number; future: boolean }>> = [];

  for (let week = WEEKS - 1; week >= 0; week -= 1) {
    const column: Array<{ key: string; count: number; future: boolean }> = [];

    for (let day = 0; day < 7; day += 1) {
      const date = new Date(end);
      date.setDate(end.getDate() - week * 7 - (6 - day));
      const key = date.toISOString().slice(0, 10);
      column.push({ key, count: counts.get(key) ?? 0, future: date > today });
    }

    weeks.push(column);
  }

  return weeks;
});

const busiestDay = computed(() => Math.max(1, ...calendar.value.flat().map((day) => day.count)));

const addedThisWeek = computed(() => {
  const last = calendar.value.at(-1) ?? [];
  return last.reduce((total, day) => total + day.count, 0);
});

/* ---- Composition: what kind of box this is ---- */

const byType = computed(() => {
  const counts = new Map<string, number>();

  for (const card of props.cards) {
    const key = card.pos ?? 'unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([pos, count]) => ({
      key: pos,
      label: pos === 'unknown' ? t('chart.noType') : t(`pos.${pos}`),
      count,
      colour: pos === 'unknown' ? 'var(--ui-bg-accented)' : partOfSpeechColour(pos as never)
    }))
    .sort((a, b) => b.count - a.count);
});

const byGroup = computed(() => {
  const counts = new Map<number, number>();

  for (const card of props.cards) {
    for (const id of card.groupIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  const ungrouped = props.cards.filter((card) => card.groupIds.length === 0).length;

  return [
    ...props.groups.map((group) => ({
      key: String(group.id),
      label: group.name,
      count: counts.get(group.id) ?? 0,
      colour: group.colour
    })),
    ...(ungrouped > 0
      ? [{ key: 'none', label: t('chart.noGroup'), count: ungrouped, colour: 'var(--ui-bg-accented)' }]
      : [])
  ].sort((a, b) => b.count - a.count);
});

const total = computed(() => Math.max(1, props.cards.length));

function percent(count: number) {
  return Math.round((count / total.value) * 100);
}

const dayFormatter = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }));
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-8">
    <!-- Ripeness -->
    <section class="space-y-3">
      <header class="flex items-baseline justify-between gap-3">
        <h2 class="text-sm font-semibold text-highlighted">
          {{ t('chart.ripeness') }}
        </h2>
        <p class="text-xs text-dimmed">
          {{ t('chart.knownOf', { known, total: cards.length }) }}
        </p>
      </header>

      <div class="flex h-8 w-full overflow-hidden rounded-lg bg-elevated">
        <UTooltip v-for="band in byRating" :key="band.rating" :text="`${band.label}: ${band.count}`">
          <div
            v-if="band.count > 0"
            class="h-full transition-[width] duration-300"
            :style="{
              width: `${(band.count / total) * 100}%`,
              backgroundColor: band.colour,
              opacity: band.opacity
            }"
          />
        </UTooltip>
      </div>

      <div class="flex flex-wrap gap-x-4 gap-y-1">
        <div v-for="band in byRating" :key="band.rating" class="flex items-center gap-1.5 text-xs">
          <span class="size-2.5 rounded-sm" :style="{ backgroundColor: band.colour, opacity: band.opacity }" />
          <span class="text-muted">{{ band.label }}</span>
          <span class="font-medium text-highlighted tabular-nums">{{ band.count }}</span>
        </div>
      </div>
    </section>

    <!-- Habit -->
    <section class="space-y-3">
      <header class="flex items-baseline justify-between gap-3">
        <h2 class="text-sm font-semibold text-highlighted">
          {{ t('chart.added') }}
        </h2>
        <p class="text-xs text-dimmed">
          {{ t('chart.thisWeek', { count: addedThisWeek }) }}
        </p>
      </header>

      <div class="no-scrollbar flex gap-1 overflow-x-auto pb-1">
        <div v-for="(week, index) in calendar" :key="index" class="flex shrink-0 flex-col gap-1">
          <UTooltip
            v-for="day in week"
            :key="day.key"
            :text="`${dayFormatter.format(new Date(day.key))}: ${day.count}`"
          >
            <div
              class="size-3.5 rounded-sm"
              :class="day.future && 'invisible'"
              :style="{
                backgroundColor: day.count > 0 ? 'var(--ui-color-primary-500)' : 'var(--ui-bg-elevated)',
                // Four visible steps.
                // Any more and the difference between two busy days stops being readable at this size.
                opacity: day.count > 0 ? 0.35 + Math.min(1, day.count / busiestDay) * 0.65 : 1
              }"
            />
          </UTooltip>
        </div>
      </div>
    </section>

    <!-- Composition -->
    <div class="grid gap-8 sm:grid-cols-2">
      <section class="space-y-3">
        <h2 class="text-sm font-semibold text-highlighted">
          {{ t('chart.byType') }}
        </h2>

        <div class="space-y-2">
          <div v-for="row in byType" :key="row.key" class="space-y-1">
            <div class="flex items-baseline justify-between gap-2 text-xs">
              <span class="truncate text-muted">{{ row.label }}</span>
              <span class="shrink-0 text-dimmed tabular-nums">{{ row.count }} · {{ percent(row.count) }}%</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-elevated">
              <div
                class="h-full rounded-full transition-[width] duration-300"
                :style="{ width: `${(row.count / total) * 100}%`, backgroundColor: row.colour }"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-sm font-semibold text-highlighted">
          {{ t('chart.byGroup') }}
        </h2>

        <p v-if="byGroup.length === 0" class="text-xs text-muted">
          {{ t('chart.noGroupsYet') }}
        </p>

        <div v-else class="space-y-2">
          <div v-for="row in byGroup" :key="row.key" class="space-y-1">
            <div class="flex items-baseline justify-between gap-2 text-xs">
              <span class="truncate text-muted">{{ row.label }}</span>
              <span class="shrink-0 text-dimmed tabular-nums">{{ row.count }} · {{ percent(row.count) }}%</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-elevated">
              <div
                class="h-full rounded-full transition-[width] duration-300"
                :style="{ width: `${(row.count / total) * 100}%`, backgroundColor: row.colour }"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
