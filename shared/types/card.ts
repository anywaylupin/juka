import type { PartOfSpeech } from '../constants/pos';
import type { Rating } from '../constants/rating';

export interface CardRecord {
  id: number;
  hanzi: string;
  pinyin: string;
  pinyinPlain: string;
  hanViet: string | null;
  translation: string;
  /**
   * The meaning in Vietnamese, or null.
   * Shown in place of the English one when the interface is Vietnamese, and editable, because it is pivoted through the English gloss and a homograph pivots wrong.
   */
  translationVi: string | null;
  pos: PartOfSpeech | null;
  /** 0 to 5 mandarins. Zero means unrated. */
  rating: Rating;
  syllables: number;
  notes: string | null;
  /** Groups this card is filed under. A card may be in none, or in several. */
  groupIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface CardListResponse {
  items: CardRecord[];
  /** Pass back as `cursor` to read the next page. Null when the list is done. */
  nextCursor: number | null;
  hasMore: boolean;
}

/** A user's own division of the box: HSK 1, verbs to drill, words from the news. */
export interface GroupRecord {
  id: number;
  name: string;
  colour: string;
  orderIndex: number;
  /** How many cards are filed under it, for the chart and the filter. */
  count?: number;
}

/** Collection totals, for the count in the header. */
export interface CardStats {
  total: number;
  /** How many cards sit at each rating, 0 through 5. */
  counts: Record<number, number>;
}

/**
 * One entry from the bundled dictionary: what the hanzi field offers while you type, and where the reading, meaning and part of speech come from.
 */
export interface DictionaryEntry {
  hanzi: string;
  pinyin: string;
  /** Toneless, no spaces. What the user typed to reach it. */
  key: string;
  gloss: string;
  /** The Vietnamese meaning, pivoted through the gloss. Null for about 59%. */
  vi: string | null;
  pos: PartOfSpeech | null;
  /**
   * Sino-Vietnamese reading, or null.
   *
   * Null for roughly half the dictionary, because Unihan's kVietnamese field is provisional and has no entry for characters as common as 时 or 就.
   * A word is given a reading only when every one of its characters resolves.
   */
  hanViet: string | null;
  /**
   * Words that mean close to the same thing, derived at build time from words that share an English gloss.
   * Empty for about 39% of the dictionary.
   */
  synonyms: string[];
}
