import { z } from 'zod'
import { MAX_RATING_LABEL } from '../constants/rating'

/**
 * The five rating names, as the user wants them.
 *
 * Six entries because position zero is the unrated slot, which has no name and
 * is never shown as a choice; keeping it in the array means every other index
 * is the rating it describes rather than the rating minus one.
 *
 * A blank entry is allowed and falls back to the default for that level, so
 * clearing a box restores the default rather than leaving an empty chip.
 */
export const ratingLabelsSchema = z
  .array(z.string().trim().max(MAX_RATING_LABEL))
  .length(6)

export const settingsUpdateSchema = z.object({
  ratingLabels: ratingLabelsSchema.nullable().optional()
})

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>
