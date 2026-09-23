import { z } from 'zod';

/**
 * Groups are the user's own division of the box, so the only rules here are the ones a database needs: a name that is not blank, and a color that is a color.
 * Everything else is theirs.
 */
export const groupCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name the group').max(40),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Pick a color')
    .default('#8c7f76'),
  orderIndex: z.coerce.number().int().min(0).max(9999).optional()
});

export const groupUpdateSchema = groupCreateSchema.partial();

export const groupIdSchema = z.object({
  id: z.coerce.number().int().positive()
});

export type GroupCreateInput = z.infer<typeof groupCreateSchema>;
export type GroupUpdateInput = z.infer<typeof groupUpdateSchema>;
