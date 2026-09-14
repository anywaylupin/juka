import { z } from 'zod'

export const unitCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name the unit').max(80),
  orderIndex: z.coerce.number().int().min(0).max(9999).optional()
})

export const unitUpdateSchema = unitCreateSchema.partial()

export const unitIdSchema = z.object({
  id: z.coerce.number().int().positive()
})

export type UnitCreateInput = z.infer<typeof unitCreateSchema>
export type UnitUpdateInput = z.infer<typeof unitUpdateSchema>
