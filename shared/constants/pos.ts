/**
 * Part of speech is a closed list, not free text.
 *
 * Two reasons.
 * The model answers with whatever wording it likes unless it is given a menu, and a free string cannot be translated into Vietnamese or filtered on.
 * Anything the model returns outside this list is dropped rather than stored, so the column only ever holds a value the interface can render.
 *
 * The set is the one Chinese grammar actually uses, which is why it has measure words and particles and no "article".
 */
export const PART_OF_SPEECH_LIST = [
  'noun',
  'verb',
  'adjective',
  'adverb',
  'pronoun',
  'numeral',
  'measure',
  'preposition',
  'conjunction',
  'particle',
  'interjection',
  'phrase',
  'idiom',
  'name'
] as const;

export type PartOfSpeech = (typeof PART_OF_SPEECH_LIST)[number];

const LOOKUP = new Set<string>(PART_OF_SPEECH_LIST);

/**
 * Accepts the abbreviations a model reaches for when it ignores the menu, so a reply of "n." or "adj" still lands on a value the interface can render.
 * Anything else is null, which reads as "not classified".
 */
const ALIASES: Record<string, PartOfSpeech> = {
  'n': 'noun',
  'n.': 'noun',
  'v': 'verb',
  'v.': 'verb',
  'vi': 'verb',
  'vt': 'verb',
  'verb phrase': 'verb',
  'adj': 'adjective',
  'adj.': 'adjective',
  'a': 'adjective',
  'stative verb': 'adjective',
  'adv': 'adverb',
  'adv.': 'adverb',
  'pron': 'pronoun',
  'pron.': 'pronoun',
  'num': 'numeral',
  'number': 'numeral',
  'mw': 'measure',
  'measure word': 'measure',
  'classifier': 'measure',
  'prep': 'preposition',
  'coverb': 'preposition',
  'conj': 'conjunction',
  'part': 'particle',
  'aux': 'particle',
  'auxiliary': 'particle',
  'interj': 'interjection',
  'exclamation': 'interjection',
  'chengyu': 'idiom',
  'expression': 'phrase',
  'proper noun': 'name'
};

/** Normalises a model reply to the closed list, or null when it does not fit. */
export function normalisePartOfSpeech(raw: string | null | undefined): PartOfSpeech | null {
  if (!raw) {
    return null;
  }

  const cleaned = raw.trim().toLowerCase();

  if (LOOKUP.has(cleaned)) {
    return cleaned as PartOfSpeech;
  }

  return ALIASES[cleaned] ?? null;
}

/**
 * A colour per part of speech, so a box of cards reads at a glance.
 *
 * Fixed across every theme, like the rating mandarin, because this is information rather than decoration.
 * Hues are spread far enough apart that the common four, noun, verb, adjective and adverb, are never close to each other, and the rarer tags share the cooler end where a near miss costs less.
 *
 * These are the mid tones.
 * The interface mixes them toward the page for a background and toward the text colour for a label, so one value serves both on white and on black.
 */
export const PART_OF_SPEECH_COLOURS: Record<PartOfSpeech, string> = {
  noun: '#2f6fd0',
  verb: '#c2410c',
  adjective: '#7c3aed',
  adverb: '#0e8f9e',
  pronoun: '#be185d',
  numeral: '#4d7c0f',
  measure: '#a16207',
  preposition: '#0f766e',
  conjunction: '#6d28d9',
  particle: '#57534e',
  interjection: '#db2777',
  phrase: '#1d4ed8',
  idiom: '#b45309',
  name: '#475569'
};

/** Falls back to the neutral text colour when a card has no part of speech. */
export function partOfSpeechColour(pos: PartOfSpeech | null | undefined): string {
  return pos ? PART_OF_SPEECH_COLOURS[pos] : 'var(--ui-text-muted)';
}
