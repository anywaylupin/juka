import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RATING_LABELS,
  LEGACY_STATUS_RATING,
  MAX_RATING,
  RATING_VALUES,
  RATING_WEIGHTS,
  clampRating,
  normaliseRatingLabels
} from '../shared/constants/rating';

describe('clampRating', () => {
  it('passes every valid rating through', () => {
    for (const value of [0, 1, 2, 3, 4, 5]) {
      expect(clampRating(value)).toBe(value);
    }
  });

  it('pins anything out of range to the ends rather than rejecting it', () => {
    expect(clampRating(-3)).toBe(0);
    expect(clampRating(9)).toBe(MAX_RATING);
  });

  it('survives the values a database column can actually hold', () => {
    // The column is a plain integer, so a bad write or an older row can put
    // anything in it. The mapper runs every row through here for that reason.
    expect(clampRating(Number.NaN)).toBe(0);
    expect(clampRating(Number.POSITIVE_INFINITY)).toBe(MAX_RATING);
    expect(clampRating(2.4)).toBe(2);
    expect(clampRating(2.6)).toBe(3);
  });
});

describe('rating labels', () => {
  it('names all five levels and leaves the unrated slot blank', () => {
    expect(DEFAULT_RATING_LABELS).toHaveLength(6);
    expect(DEFAULT_RATING_LABELS[0]).toBe('');
    expect([...DEFAULT_RATING_LABELS].slice(1)).toEqual(['new', 'difficult', 'hesitant', 'good', 'mastered']);
  });

  it('always returns six entries, whatever was stored', () => {
    // The column is free text a user can edit, so every shape has to have an
    // answer rather than leaving the interface with a nameless rating.
    for (const stored of [null, undefined, [], ['a'], 'nonsense', 42, {}]) {
      expect(normaliseRatingLabels(stored)).toHaveLength(6);
    }
  });

  it('falls back per level, so clearing one box restores only that default', () => {
    const labels = normaliseRatingLabels(['', 'brand new', '  ', 'shaky', '', 'solid']);

    expect(labels[1]).toBe('brand new');
    // Blank falls back rather than rendering an empty chip.
    expect(labels[2]).toBe('difficult');
    expect(labels[3]).toBe('shaky');
    expect(labels[4]).toBe('good');
    expect(labels[5]).toBe('solid');
  });

  it('trims and caps a label rather than letting it break the layout', () => {
    const labels = normaliseRatingLabels(['', '  spaced  ', 'x'.repeat(80), '', '', '']);

    expect(labels[1]).toBe('spaced');
    expect(labels[2]).toHaveLength(24);
  });
});

describe('practice weights', () => {
  it('deals a weakly known card more often than a mastered one', () => {
    expect(RATING_WEIGHTS[0]).toBeGreaterThan(RATING_WEIGHTS[5]);
    expect(RATING_WEIGHTS[1]).toBeGreaterThan(RATING_WEIGHTS[5]);
  });

  it('never rises as a card gets better known', () => {
    for (const value of RATING_VALUES) {
      expect(RATING_WEIGHTS[value]).toBeLessThanOrEqual(RATING_WEIGHTS[(value - 1) as 0 | 1 | 2 | 3 | 4]);
    }
  });

  it('still gives a mastered card a real chance of coming up', () => {
    // The point of the shuffle is a thumb on the scale, not a filter. A weight
    // of zero would quietly turn the stack into "cards you do not know", and a
    // card you have wrongly marked mastered would never resurface.
    expect(RATING_WEIGHTS[5]).toBeGreaterThan(0);
  });
});

describe('legacy status mapping', () => {
  it('maps the four old statuses onto the named scale', () => {
    // The names are now new, difficult, hesitant, good, mastered, so the four
    // old statuses sit at 2 through 5 with `new` beneath them.
    expect(LEGACY_STATUS_RATING).toEqual({
      difficult: 2,
      hesitant: 3,
      good: 4,
      mastered: 5
    });
  });

  it('lines every old status up with the level of the same name', () => {
    for (const [status, rating] of Object.entries(LEGACY_STATUS_RATING)) {
      expect(DEFAULT_RATING_LABELS[rating]).toBe(status);
    }
  });
});
