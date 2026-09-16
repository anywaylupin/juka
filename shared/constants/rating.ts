/**
 * How well you know a card, as a row of mandarins.
 *
 * Five levels, each with a name.
 * The names came back after a spell as bare numbers: "3 of 5" is precise and says nothing, where "hesitant" is the word you would actually use about a card you half know.
 * The number is still what is stored and what sorts, and the name is what the interface says.
 *
 * Zero is unrated, which is what a card is before you have an opinion.
 * It is not a sixth level below one, and it has no name.
 *
 * A rating is a label the user sets.
 * Nothing in the app changes a rating on its own.
 * The practice shuffle reads it, which is the one place a rating affects what you see next, and that is deliberate and confined to that view.
 */
export const MIN_RATING = 0;
export const MAX_RATING = 5;

export type Rating = 0 | 1 | 2 | 3 | 4 | 5;

export const RATING_VALUES = [1, 2, 3, 4, 5] as const;

/**
 * The default names, which a user may rename.
 *
 * Indexed by rating, so position 0 is the unrated slot and is never shown as a choice.
 * These are the four old statuses with `new` restored at the bottom, which is where a card actually starts.
 */
export const DEFAULT_RATING_LABELS = ['', 'new', 'difficult', 'hesitant', 'good', 'mastered'] as const;

/** How many characters a custom label may run to before it stops fitting. */
export const MAX_RATING_LABEL = 24;

/**
 * One fixed colour, not a per level scale and not the theme primary.
 *
 * A five step colour ramp would be five things to learn where the count is already the whole message, and borrowing the theme primary would make a rating look like a button.
 * A filled mandarin is filled; the number of them is the information.
 */
export const RATING_COLOUR = '#f5821f';

/** Icons come from the installed sets. Nothing here is hand drawn. */
export const RATING_ICON = 'i-icon-park-outline-orange';

/**
 * How much more often a weakly known card comes up in the practice shuffle.
 *
 * Indexed by rating.
 * An unrated or new card is dealt eight times as often as a mastered one, which is steep enough to feel useful and shallow enough that a mastered card still turns up and can be demoted.
 *
 * This is the **only** place in the app where a stored value decides what you see next, and it is confined to the shuffle in the stack view.
 * It is not spaced repetition: there is no schedule, no due date, and no memory of when you last saw a card.
 * Reload and you get a different order.
 */
export const RATING_WEIGHTS: Record<Rating, number> = {
  0: 8,
  1: 8,
  2: 6,
  3: 4,
  4: 2,
  5: 1
};

/**
 * The old four statuses, mapped onto the scale.
 * Kept because migration 0004 reads it and because anything importing older exports needs an answer.
 */
export const LEGACY_STATUS_RATING: Record<string, Rating> = {
  difficult: 2,
  hesitant: 3,
  good: 4,
  mastered: 5
};

export function clampRating(value: number): Rating {
  // NaN is the only value with no sensible end to pin to, so it reads as unrated.
  // An infinity still has a direction and clamps like any other number out of range, which an earlier version got wrong by lumping it in with NaN.
  if (Number.isNaN(value)) {
    return 0;
  }

  const rounded = Math.round(value);

  if (rounded < MIN_RATING) {
    return MIN_RATING as Rating;
  }

  return (rounded > MAX_RATING ? MAX_RATING : rounded) as Rating;
}

/**
 * Normalises a stored label set, which may be absent, short, or full of blanks.
 *
 * Always returns six entries so callers can index by rating without checking.
 * A blank at any position falls back to the default for that level rather than rendering an empty chip.
 */
export function normaliseRatingLabels(stored: unknown): string[] {
  const source = Array.isArray(stored) ? stored : [];

  return DEFAULT_RATING_LABELS.map((fallback, index) => {
    const value = typeof source[index] === 'string' ? (source[index] as string).trim() : '';
    return value.slice(0, MAX_RATING_LABEL) || fallback;
  });
}
