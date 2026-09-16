import { normalisePartOfSpeech } from '#shared/constants/pos';
import { clampRating } from '#shared/constants/rating';
import type { CardRecord } from '#shared/types/card';

export interface CardRow {
  id: number;
  hanzi: string;
  pinyin: string;
  pinyinPlain: string;
  hanViet: string | null;
  translation: string;
  translationVi: string | null;
  pos: string | null;
  rating: number;
  syllables: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * One place that decides the wire shape of a card.
 *
 * Group membership lives in a join table, so it is passed in rather than read
 * from the row: the list route fetches every card's groups in one query and
 * hands them down, which is the difference between one extra query and one per
 * card.
 */
export function toCardRecord(row: CardRow, groupIds: number[] = []): CardRecord {
  return {
    id: row.id,
    hanzi: row.hanzi,
    pinyin: row.pinyin,
    pinyinPlain: row.pinyinPlain,
    hanViet: row.hanViet,
    translation: row.translation,
    translationVi: row.translationVi,
    // Rows written before the closed list existed can hold free text. Narrow
    // here so the client never has to guess whether pos is renderable.
    pos: normalisePartOfSpeech(row.pos),
    rating: clampRating(row.rating),
    syllables: row.syllables,
    notes: row.notes,
    groupIds,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}
