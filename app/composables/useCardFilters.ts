import type { PartOfSpeech } from '#shared/constants/pos';
import type { Rating } from '#shared/constants/rating';
import type { CardRecord } from '#shared/types/card';

export interface CardFilters {
  q: string;
  /** Ratings to include. Empty means every rating. */
  ratings: Rating[];
  /** Parts of speech to include. Empty means every part of speech. */
  parts: PartOfSpeech[];
  /** Character counts to include. Empty means every length. */
  lengths: number[];
  /** Groups to include. Empty means every group and no group. */
  groups: number[];
}

function emptyFilters(): CardFilters {
  return { q: '', ratings: [], parts: [], lengths: [], groups: [] };
}

/**
 * Narrowing the box down, entirely in the browser.
 *
 * The store already holds every card, so filtering is a computed rather than a round trip.
 * That is what lets the filter groups feel instant, and it is what lets the stack and the chart read the same narrowed list the gallery shows: a filter applies to whatever view you are in, not just to one of them.
 *
 * Search is deliberately simpler than the FTS5 index behind /api/cards: it matches the hanzi, either pinyin form, the meaning and the Han-Viet reading as plain substrings.
 * For a collection held in memory that is enough, and it behaves the same signed in or out.
 */
export function useCardFilters(source: Ref<CardRecord[]>) {
  const filters = useState<CardFilters>('juka:filters', emptyFilters);

  const active = computed(
    () =>
      filters.value.q.trim().length > 0 ||
      filters.value.ratings.length > 0 ||
      filters.value.parts.length > 0 ||
      filters.value.lengths.length > 0 ||
      filters.value.groups.length > 0
  );

  const activeCount = computed(
    () =>
      (filters.value.q.trim() ? 1 : 0) +
      filters.value.ratings.length +
      filters.value.parts.length +
      filters.value.lengths.length +
      filters.value.groups.length
  );

  const results = computed<CardRecord[]>(() => {
    const { q, ratings, parts, lengths, groups } = filters.value;
    const needle = q.trim().toLowerCase();

    return source.value.filter((card) => {
      if (ratings.length > 0 && !ratings.includes(card.rating)) {
        return false;
      }
      if (parts.length > 0 && (!card.pos || !parts.includes(card.pos))) {
        return false;
      }
      if (groups.length > 0 && !groups.some((id) => card.groupIds.includes(id))) {
        return false;
      }
      // The last bucket is "this many or more", so a five character idiom is not simply missing from every length filter.
      if (
        lengths.length > 0 &&
        !lengths.some((length) => (length === 4 ? card.syllables >= 4 : card.syllables === length))
      ) {
        return false;
      }
      if (!needle) {
        return true;
      }

      return (
        card.hanzi.includes(q.trim()) ||
        card.pinyin.toLowerCase().includes(needle) ||
        card.pinyinPlain.includes(needle.replaceAll(/\s+/g, '')) ||
        card.translation.toLowerCase().includes(needle) ||
        (card.hanViet?.toLowerCase().includes(needle) ?? false)
      );
    });
  });

  type ListKey = 'ratings' | 'parts' | 'lengths' | 'groups';

  /** Toggles one value in one of the list filters. */
  function toggle<K extends ListKey>(key: K, value: CardFilters[K][number]) {
    const current = filters.value[key] as Array<typeof value>;
    const next = current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value];

    filters.value = { ...filters.value, [key]: next };
  }

  function clearGroup(key: ListKey) {
    filters.value = { ...filters.value, [key]: [] };
  }

  function clearAll() {
    filters.value = emptyFilters();
  }

  return { filters, results, active, activeCount, toggle, clearGroup, clearAll };
}
