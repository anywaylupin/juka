export type CardStatus = 'difficult' | 'hesitant' | 'good' | 'mastered'

export interface CardRecord {
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
  createdAt: string
  updatedAt: string
}

export interface CardListResponse {
  items: CardRecord[]
  /** Pass back as `cursor` to read the next page. Null when the list is done. */
  nextCursor: number | null
  hasMore: boolean
}

export interface UnitRecord {
  id: number
  name: string
  orderIndex: number
  total: number
  counts: Record<CardStatus, number>
}

export interface UnitListResponse {
  items: UnitRecord[]
  /** Cards with no unit, which the list page shows as a virtual unit. */
  unfiled: number
}
