import { pinyin } from 'pinyin-pro';

const HAN = /\p{Script=Han}/u;
const HAN_OR_WORD = /\p{Script=Han}+|[a-z0-9]+/giu;

export interface DerivedCardFields {
  pinyin: string;
  pinyinPlain: string;
  hanziChars: string;
  pinyinSearch: string;
  syllables: number;
}

/**
 * The single place card fields are derived from hanzi.
 * Everything here is written on create and on update, so the stored values can never drift from the hanzi they describe.
 */
export function deriveCardFields(hanzi: string, suppliedPinyin?: string | null): DerivedCardFields {
  const trimmed = hanzi.trim();
  const characters = [...trimmed].filter((character) => HAN.test(character));

  const toned = suppliedPinyin?.trim() || pinyin(trimmed, { toneType: 'symbol', type: 'string' });

  // pinyin-pro returns syllables separated by spaces: 时间 becomes "shi jian".
  const syllableList = pinyin(trimmed, { toneType: 'none', type: 'string' }).toLowerCase().split(/\s+/).filter(Boolean);

  const joined = syllableList.join('');

  return {
    pinyin: toned,
    pinyinPlain: joined,
    // 时间 becomes "时 间" so a standard FTS5 tokenizer can index it.
    hanziChars: characters.join(' '),
    // Both forms, so "shijian" and "jian" each find the card.
    pinyinSearch: [joined, ...syllableList].filter(Boolean).join(' '),
    syllables: characters.length
  };
}

/**
 * Turns whatever the user typed into an FTS5 MATCH expression.
 *
 * Only runs of Han characters and alphanumerics are extracted, so no FTS5 syntax from the input ever reaches the query.
 * Han runs become phrases ("时 间"), Latin runs become prefix terms (shi*), and the terms are ANDed.
 *
 * Returns null when there is nothing searchable, which callers read as "no text filter".
 */
export function buildSearchMatch(raw: string): string | null {
  const terms: string[] = [];

  for (const match of raw.matchAll(HAN_OR_WORD)) {
    const term = match[0];
    if (!term) {
      continue;
    }
    terms.push(HAN.test(term) ? `"${[...term].join(' ')}"` : `${term.toLowerCase()}*`);
  }

  return terms.length > 0 ? terms.join(' ') : null;
}
