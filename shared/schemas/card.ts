import { z } from 'zod'

export const cardStatusSchema = z.enum(['difficult', 'hesitant', 'good', 'mastered'])

export const cardListQuerySchema = z.object({
  q: z.string().trim().max(64).optional(),
  unitId: z.coerce.number().int().positive().optional(),
  status: cardStatusSchema.optional(),
  hskLevel: z.coerce.number().int().min(1).max(9).optional(),
  syllables: z.coerce.number().int().min(1).max(12).optional(),
  /** Keyset cursor: the id of the last card on the previous page. */
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40)
})

export const cardCreateSchema = z.object({
  hanzi: z.string().trim().min(1, 'Add the hanzi').max(32),
  pinyin: z.string().trim().max(128).optional(),
  hanViet: z.string().trim().max(128).nullable().optional(),
  translation: z.string().trim().max(500).default(''),
  pos: z.string().trim().max(32).nullable().optional(),
  hskLevel: z.coerce.number().int().min(1).max(9).nullable().optional(),
  unitId: z.coerce.number().int().positive().nullable().optional(),
  status: cardStatusSchema.default('difficult'),
  notes: z.string().trim().max(2000).nullable().optional()
})

export const cardUpdateSchema = cardCreateSchema.partial()

export const cardIdSchema = z.object({
  id: z.coerce.number().int().positive()
})

export type CardListQuery = z.infer<typeof cardListQuerySchema>
export type CardCreateInput = z.infer<typeof cardCreateSchema>
export type CardUpdateInput = z.infer<typeof cardUpdateSchema>
