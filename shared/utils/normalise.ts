import { normalisePartOfSpeech } from '../constants/pos';
import { clampRating } from '../constants/rating';
import type { CardRecord, GroupRecord } from '../types/card';
import { countSyllables, tonelessPinyin } from './pinyin';

/**
 * Repairs a card or a group read out of local storage.
 *
 * **Local storage has no migrations.** D1 gets a numbered SQL file whenever a column appears; a browser gets whatever shape the app happened to write the last time someone used it, possibly months and several releases ago.
 * So the read is the migration: every field is filled in, coerced, or dropped here, and nothing downstream has to wonder whether it exists.
 *
 * This is not hypothetical.
 * Cards written before groups existed have no `groupIds`, and seven call sites called `.map`, `.includes` or `.length` on it.
 * One of them threw and took the whole page down, because a component that cannot render its props does not degrade, it crashes.
 *
 * The rule: a card needs a hanzi, and everything else has a default.
 */

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function timestamp(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : new Date().toISOString();
}

function numbers(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
    : [];
}

/** One card, or null when what was stored cannot be read as a card at all. */
export function normaliseCard(input: unknown, fallbackId: number): CardRecord | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const hanzi = text(raw.hanzi).trim();

  // A card with no word on it is not a card. Everything else is recoverable.
  if (!hanzi) {
    return null;
  }

  const pinyin = text(raw.pinyin);

  return {
    id: typeof raw.id === 'number' && Number.isFinite(raw.id) ? raw.id : fallbackId,
    hanzi,
    pinyin,
    // Derived columns are recomputed rather than trusted, so a card written by a version with the old broken folding gets a working search key back.
    pinyinPlain: tonelessPinyin(pinyin),
    hanViet: nullableText(raw.hanViet),
    translation: text(raw.translation),
    translationVi: nullableText(raw.translationVi),
    pos: normalisePartOfSpeech(text(raw.pos)),
    rating: clampRating(typeof raw.rating === 'number' ? raw.rating : 0),
    syllables: countSyllables(hanzi),
    notes: nullableText(raw.notes),
    groupIds: numbers(raw.groupIds),
    createdAt: timestamp(raw.createdAt),
    updatedAt: timestamp(raw.updatedAt)
  };
}

/** Every readable card, in order, with unreadable entries dropped. */
export function normaliseCards(input: unknown): CardRecord[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry, index) => normaliseCard(entry, -(index + 1)))
    .filter((card): card is CardRecord => card !== null);
}

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;
const FALLBACK_COLOUR = '#8c7f76';

export function normaliseGroup(input: unknown, fallbackId: number): GroupRecord | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const name = text(raw.name).trim();

  if (!name) {
    return null;
  }

  const colour = text(raw.colour);

  return {
    id: typeof raw.id === 'number' && Number.isFinite(raw.id) ? raw.id : fallbackId,
    name,
    // An invalid colour would land in a style binding, so it is checked rather than passed through.
    colour: HEX_COLOUR.test(colour) ? colour : FALLBACK_COLOUR,
    orderIndex: typeof raw.orderIndex === 'number' && Number.isFinite(raw.orderIndex) ? raw.orderIndex : 0
  };
}

export function normaliseGroups(input: unknown): GroupRecord[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((entry, index) => normaliseGroup(entry, -(index + 1)))
    .filter((group): group is GroupRecord => group !== null);
}
