import { MAX_RATING_LABEL, RATING_VALUES, type Rating } from '#shared/constants/rating';

/**
 * What the five rating levels are called.
 *
 * Signed in, the names live on the account so they follow you.
 * Signed out they live in local storage, same deal as the cards and the groups.
 *
 * There is always an answer: an account that never set them, a browser with nothing stored, and a half filled array all fall back, so no caller ever has to handle a missing name.
 *
 * The fallback is the **locale's** wording, not a fixed English list.
 * Vietnamese gets mới, khó, lưỡng lự, khá and thuộc, which are the words a Vietnamese learner would actually use rather than translations of the English ones.
 * A name the user typed is theirs and is never replaced when the locale changes.
 */

const STORAGE_KEY = 'juka.ratingLabels';

/** What was stored, unresolved. A blank entry means "use the locale default". */
function readLocal(): string[] {
  if (import.meta.server) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    return Array.isArray(parsed) ? parsed.map((entry) => (typeof entry === 'string' ? entry : '')) : [];
  } catch {
    return [];
  }
}

export function useRatingLabels() {
  const session = useSession();
  const { t } = useI18n();

  const local = useState<string[]>('juka:rating-labels', () => []);

  if (import.meta.client) {
    local.value = readLocal();
  }

  /** What the user stored, blanks and all. */
  const stored = computed<string[]>(() => {
    const source = session.signedIn.value ? session.account.value?.ratingLabels : local.value;
    return Array.isArray(source) ? source : [];
  });

  const labels = computed<string[]>(() => [
    '',
    ...RATING_VALUES.map((value) => {
      const own = (stored.value[value] ?? '').trim().slice(0, MAX_RATING_LABEL);
      return own || t(`rating.default.${value}`);
    })
  ]);

  /** The name for a rating, or empty for unrated, which has none. */
  function labelFor(rating: Rating): string {
    return labels.value[rating] ?? '';
  }

  /** True once any name was set by hand, so a reset can be offered. */
  const customised = computed(() => RATING_VALUES.some((value) => (stored.value[value] ?? '').trim().length > 0));

  async function save(next: string[] | null) {
    /*
     * A box matching the locale default is stored blank rather than as that word.
     * Otherwise switching to Vietnamese would leave the English names frozen in place, because they would look like a deliberate choice.
     */
    const cleaned =
      next === null
        ? null
        : [
            '',
            ...RATING_VALUES.map((value) => {
              const own = (next[value] ?? '').trim().slice(0, MAX_RATING_LABEL);
              return own === t(`rating.default.${value}`) ? '' : own;
            })
          ];

    if (session.signedIn.value) {
      await session.updateSettings({ ratingLabels: cleaned });
      return;
    }

    local.value = cleaned ?? [];

    try {
      if (cleaned === null) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      }
    } catch {
      /* quota or a blocked store; the session copy is still correct */
    }
  }

  return { labels, labelFor, customised, save };
}
