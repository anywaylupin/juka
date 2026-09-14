import type { CardRecord, CardStatus } from '#shared/types/card'

export interface CardRow {
  id: number
  unitId: number | null
  unitName: string | null
  hanzi: string
  pinyin: string
  pinyinPlain: string
  hanViet: string | null
  translation: string
  pos: string | null
  hskLevel: number | null
  status: CardStatus
  syllables: number
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

/** One place that decides the wire shape of a card. */
export function toCardRecord(row: CardRow): CardRecord {
  return {
    id: row.id,
    unitId: row.unitId,
    unitName: row.unitName,
    hanzi: row.hanzi,
    pinyin: row.pinyin,
    pinyinPlain: row.pinyinPlain,
    hanViet: row.hanViet,
    translation: row.translation,
    pos: row.pos,
    hskLevel: row.hskLevel,
    status: row.status,
    syllables: row.syllables,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}
