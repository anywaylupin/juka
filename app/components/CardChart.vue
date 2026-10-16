<script setup lang="ts">
import { partOfSpeechColor, type PartOfSpeech } from '#shared/constants/pos';
import { RATING_COLOR, RATING_ICON, RATING_VALUES, type Rating } from '#shared/constants/rating';
import type { CardRecord, GroupRecord } from '#shared/types/card';
import type { CardFilters } from '~/composables/useCardFilters';

/**
 * What the box looks like from above.
 *
 * The answer comes first, as four numbers in the display face: how many cards, how many known well, how many added this week, how many still unrated.
 * Below them the same three questions as charts: how well do I know it, am I keeping it up, and what is in it.
 *
 * Color keeps the two meanings it has everywhere else.
 * Ink carries every bar and the calendar, the tangerine mandarin marks only mastery, and word types and groups show their own color as a small mark beside the label rather than as a heavy bar, because five hues of bar were the loudest thing on the page and the least important.
 * A level is told apart by its count of mandarins, the way a card shows it, not by five near identical oranges.
 *
 * Every row is a way into the box: pressing a level, a word type or a group opens the Box filtered to it.
 *
 * Built from divs rather than SVG or a charting library, because everything here is a proportion or a count, and it keeps the text selectable and readable by a screen reader.
 */
const props = defineProps<{
  cards: CardRecord[];
  groups: GroupRecord[];
}>();

const { t, locale } = useI18n();
const { labelFor } = useRatingLabels();
const localePath = useLocalePath();
const filters = useState<CardFilters>('juka:filters');

/** Opens the Box showing only the cards a row counted. */
async function showInBox(patch: Partial<CardFilters>) {
  filters.value = { q: '', ratings: [], parts: [], lengths: [], groups: [], ...patch };
  await navigateTo(localePath('/'));
}

const total = computed(() => props.cards.length);

function percent(count: number) {
  return Math.round((count / Math.max(1, total.value)) * 100);
}

/* ---- Ripeness ---- */

/**
 * Ink at five strengths for unrated through good, and the rating tangerine for mastered alone.
 * The bar reads as how much ink the box has taken, with the one color reserved for the thing worth reaching.
 */
const LEVEL_FILL: Record<Rating, string> = {
  0: 'var(--ui-bg-accented)',
  1: 'color-mix(in oklab, var(--ui-text-highlighted) 18%, transparent)',
  2: 'color-mix(in oklab, var(--ui-text-highlighted) 34%, transparent)',
  3: 'color-mix(in oklab, var(--ui-text-highlighted) 52%, transparent)',
  4: 'color-mix(in oklab, var(--ui-text-highlighted) 78%, transparent)',
  5: RATING_COLOR
};

const byRating = computed(() => {
  const counts = new Map<number, number>();
  for (const card of props.cards) {
    counts.set(card.rating, (counts.get(card.rating) ?? 0) + 1);
  }
  return ([0, ...RATING_VALUES] as Rating[]).map((rating) => ({
    rating,
    label: rating === 0 ? t('filter.unrated') : labelFor(rating),
    count: counts.get(rating) ?? 0,
    fill: LEVEL_FILL[rating]
  }));
});

const known = computed(() => props.cards.filter((card) => card.rating >= 4).length);
const unrated = computed(() => props.cards.filter((card) => card.rating === 0).length);

/* ---- Habit: cards added per day ---- */

/** Half a year of weeks: long enough to show a habit, short enough that every week stays a readable square across the table. */
const WEEKS = 26;

/**
 * A calendar day in the reader's own timezone.
 * `toISOString()` gives the UTC day, so east of Greenwich every square was a day off: today's cards landed in tomorrow's square, which is hidden as future, under a "14 this week" that the grid did not show.
 */
function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const calendar = computed(() => {
  const counts = new Map<string, number>();
  for (const card of props.cards) {
    const key = dayKey(new Date(card.createdAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Forward to the coming Saturday, so every column is a whole week starting on Sunday.
  const end = new Date(today);
  end.setDate(end.getDate() - end.getDay() + 6);

  const weeks: Array<{ month: string; days: Array<{ key: string; date: Date; count: number; future: boolean }> }> = [];
  let lastMonth = -1;

  for (let week = WEEKS - 1; week >= 0; week -= 1) {
    const days = [];
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(end);
      date.setDate(end.getDate() - week * 7 - (6 - day));
      const key = dayKey(date);
      days.push({ key, date, count: counts.get(key) ?? 0, future: date > today });
    }
    /* A month is named over the first week that starts in it, the way a wall calendar heads its columns. */
    const month = days[0]!.date.getMonth();
    weeks.push({ month: month === lastMonth ? '' : monthFormatter.value.format(days[0]!.date), days });
    lastMonth = month;
  }

  return weeks;
});

const monthFormatter = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'short' }));
const dayFormatter = computed(() => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }));

/** Monday, Wednesday and Friday label their rows; seven labels on rows this small would crowd each other. */
const weekdayLabels = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'short' });
  const sunday = new Date(2024, 0, 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    return index % 2 === 1 ? formatter.format(date) : '';
  });
});

const busiestDay = computed(() => Math.max(1, ...calendar.value.flatMap((week) => week.days.map((day) => day.count))));

/** Four steps of ink. Any more and two busy days stop being told apart at this size. */
function dayFill(count: number) {
  if (count === 0) {
    return 'transparent';
  }
  const step = Math.ceil((Math.min(count, busiestDay.value) / busiestDay.value) * 4);
  return `color-mix(in oklab, var(--ui-text-highlighted) ${[0, 22, 44, 66, 88][step]}%, transparent)`;
}

const addedThisWeek = computed(() => (calendar.value.at(-1)?.days ?? []).reduce((sum, day) => sum + day.count, 0));

/* ---- Composition ---- */

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
      mark: pos === 'unknown' ? undefined : partOfSpeechColor(pos as PartOfSpeech)
    }))
    .sort((a, b) => b.count - a.count);
});

/** Empty groups are hidden until asked for: six rows of nothing buried the two that had cards. */
const showAllGroups = ref(false);

const allGroups = computed(() => {
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
      id: group.id as number | undefined,
      label: group.name,
      count: counts.get(group.id) ?? 0,
      mark: group.color as string | undefined
    })),
    ...(ungrouped > 0
      ? [{ key: 'none', id: undefined, label: t('chart.noGroup'), count: ungrouped, mark: undefined }]
      : [])
  ].sort((a, b) => b.count - a.count);
});

const byGroup = computed(() =>
  showAllGroups.value ? allGroups.value : allGroups.value.filter((group) => group.count > 0)
);
const hiddenGroups = computed(() => allGroups.value.length - allGroups.value.filter((group) => group.count > 0).length);

const stats = computed(() => [
  { label: t('chart.total'), value: total.value },
  { label: t('chart.known'), value: known.value, hint: `${percent(known.value)}%` },
  { label: t('chart.added'), value: addedThisWeek.value, hint: t('chart.thisWeekShort') },
  { label: t('filter.unrated'), value: unrated.value }
]);
</script>

<template>
  <!-- On a wide screen the page fits the table: numbers across the top, then a two by two of paper, each section scrolling inside itself if it must, never the page. -->
  <div class="flex flex-col gap-4 lg:h-full lg:min-h-0">
    <!-- The answer first. -->
    <div class="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
      <UCard v-for="stat in stats" :key="stat.label" :ui="{ body: 'px-4 py-2.5 sm:px-4 sm:py-2.5' }">
        <p class="text-sm text-muted">{{ stat.label }}</p>
        <p class="flex items-baseline gap-2">
          <span class="font-[family-name:var(--font-display)] text-3xl font-bold text-highlighted tabular-nums">{{
            stat.value
          }}</span>
          <span v-if="stat.hint" class="text-sm text-muted">{{ stat.hint }}</span>
        </p>
      </UCard>
    </div>

    <div class="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-flow-col lg:grid-cols-2 lg:grid-rows-2">
      <!-- Ripeness -->
      <UCard as="section" :ui="JUKA_SECTION">
        <h2 class="juka-subheading shrink-0 text-base">{{ t('chart.ripeness') }}</h2>

        <div
          class="flex h-4 overflow-hidden rounded-sm bg-elevated"
          role="img"
          :aria-label="t('chart.knownOf', { known, total })"
        >
          <div
            v-for="level in byRating"
            v-show="level.count > 0"
            :key="level.rating"
            :style="{ width: `${percent(level.count)}%`, backgroundColor: level.fill }"
          />
        </div>

        <ul class="juka-section-body grid content-start gap-x-3 sm:grid-cols-2">
          <li v-for="level in byRating" :key="level.rating">
            <button
              type="button"
              class="flex min-h-9 w-full items-center gap-3 rounded-sm px-2 text-left hover:bg-elevated"
              :class="level.count === 0 && 'opacity-50'"
              :aria-label="`${level.label}: ${level.count}`"
              @click="showInBox({ ratings: [level.rating] })"
            >
              <span class="flex w-20 shrink-0 gap-0.5" aria-hidden="true">
                <UIcon
                  v-for="index in 5"
                  :key="index"
                  :name="RATING_ICON"
                  class="size-3.5"
                  :class="index <= level.rating ? 'text-rating' : 'text-dimmed'"
                />
              </span>
              <span class="flex-1 text-sm text-highlighted first-letter:uppercase">{{ level.label }}</span>
              <span class="text-sm font-bold text-highlighted tabular-nums">{{ level.count }}</span>
            </button>
          </li>
        </ul>
      </UCard>

      <!-- Habit -->
      <UCard as="section" :ui="JUKA_SECTION">
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="juka-subheading shrink-0 text-base">{{ t('chart.added') }}</h2>
          <p class="text-sm text-muted">{{ t('chart.thisWeek', { count: addedThisWeek }) }}</p>
        </div>

        <div class="juka-section-body flex flex-1 gap-2 overflow-x-auto pb-1 lg:overflow-y-hidden">
          <div
            class="grid shrink-0 grid-rows-[1rem_repeat(7,minmax(0,1fr))] gap-1 text-xs text-muted"
            aria-hidden="true"
          >
            <span />
            <span v-for="(label, index) in weekdayLabels" :key="index" class="flex items-center leading-none">{{
              label
            }}</span>
          </div>
          <div class="grid flex-1 auto-cols-[minmax(0.75rem,1fr)] grid-flow-col gap-1">
            <div
              v-for="(week, index) in calendar"
              :key="index"
              class="grid grid-rows-[1rem_repeat(7,minmax(0,1fr))] gap-1"
            >
              <span class="text-xs whitespace-nowrap text-muted">{{ week.month }}</span>
              <UTooltip
                v-for="day in week.days"
                :key="day.key"
                :text="`${dayFormatter.format(day.date)}: ${day.count}`"
              >
                <div
                  class="juka-day h-full min-h-2"
                  :class="day.future && 'invisible'"
                  :style="{ backgroundColor: dayFill(day.count) }"
                />
              </UTooltip>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Composition -->
      <UCard as="section" :ui="JUKA_SECTION">
        <h2 class="juka-subheading shrink-0 text-base">{{ t('chart.byType') }}</h2>
        <ul class="juka-section-body">
          <li v-for="row in byType" :key="row.key">
            <button
              type="button"
              class="w-full space-y-1 rounded-sm px-2 py-1.5 text-left hover:bg-elevated disabled:cursor-default disabled:hover:bg-transparent"
              :disabled="row.key === 'unknown'"
              @click="showInBox({ parts: [row.key as PartOfSpeech] })"
            >
              <span class="flex items-center gap-2 text-sm">
                <span
                  v-if="row.mark"
                  class="size-2.5 rounded-xs"
                  :style="{ backgroundColor: row.mark }"
                  aria-hidden="true"
                />
                <span class="flex-1 text-highlighted">{{ row.label }}</span>
                <span class="font-bold text-highlighted tabular-nums">{{ row.count }}</span>
                <span class="w-10 text-right text-muted tabular-nums">{{ percent(row.count) }}%</span>
              </span>
              <UProgress :model-value="percent(row.count)" color="neutral" size="xs" />
            </button>
          </li>
        </ul>
      </UCard>

      <UCard as="section" :ui="JUKA_SECTION">
        <h2 class="juka-subheading shrink-0 text-base">{{ t('chart.byGroup') }}</h2>
        <p v-if="allGroups.length === 0" class="text-sm text-muted">{{ t('chart.noGroupsYet') }}</p>
        <ul v-else class="juka-section-body">
          <li v-for="row in byGroup" :key="row.key">
            <button
              type="button"
              class="w-full space-y-1 rounded-sm px-2 py-1.5 text-left hover:bg-elevated disabled:cursor-default disabled:hover:bg-transparent"
              :disabled="row.id === undefined"
              @click="row.id !== undefined && showInBox({ groups: [row.id] })"
            >
              <span class="flex items-center gap-2 text-sm">
                <span
                  v-if="row.mark"
                  class="size-2.5 rounded-xs"
                  :style="{ backgroundColor: row.mark }"
                  aria-hidden="true"
                />
                <span class="flex-1 text-highlighted">{{ row.label }}</span>
                <span class="font-bold text-highlighted tabular-nums">{{ row.count }}</span>
                <span class="w-10 text-right text-muted tabular-nums">{{ percent(row.count) }}%</span>
              </span>
              <UProgress :model-value="percent(row.count)" color="neutral" size="xs" />
            </button>
          </li>
        </ul>
        <UButton
          v-if="hiddenGroups > 0 || showAllGroups"
          color="neutral"
          variant="link"
          size="sm"
          @click="showAllGroups = !showAllGroups"
        >
          {{ showAllGroups ? t('chart.hideEmptyGroups') : t('chart.showAllGroups', { count: hiddenGroups }) }}
        </UButton>
      </UCard>
    </div>
  </div>
</template>
