import { z } from 'zod';
import { PART_OF_SPEECH_LIST } from '../constants/pos';
import { MAX_RATING, MIN_RATING } from '../constants/rating';

export const partOfSpeechSchema = z.enum(PART_OF_SPEECH_LIST);

/** 0 to 5 mandarins. Zero is unrated, not a level below one. */
export const ratingSchema = z.coerce.number().int().min(MIN_RATING).max(MAX_RATING);

export const cardListQuerySchema = z.object({
  q: z.string().trim().max(64).optional(),
  rating: ratingSchema.optional(),
  pos: partOfSpeechSchema.optional(),
  groupId: z.coerce.number().int().positive().optional(),
  syllables: z.coerce.number().int().min(1).max(12).optional(),
  /** Keyset cursor: the id of the last card on the previous page. */
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(60)
});

export const cardCreateSchema = z.object({
  hanzi: z.string().trim().min(1, 'Add the hanzi').max(32),
  pinyin: z.string().trim().max(128).optional(),
  hanViet: z.string().trim().max(128).nullable().optional(),
  /*
   * The meaning and the part of speech come from the bundled dictionary, not from a field the user fills in.
   * They are still accepted here because the client is the one that looked them up, and because a card written before a dictionary rebuild should keep the wording it was filed with.
   */
  translation: z.string().trim().max(500).default(''),
  translationVi: z.string().trim().max(500).nullable().optional(),
  pos: partOfSpeechSchema.nullable().optional(),
  rating: ratingSchema.default(0),
  notes: z.string().trim().max(2000).nullable().optional(),
  /**
   * Groups this card belongs to.
   * Absent means "leave them alone" on an update, which is different from an empty array meaning "remove it from all of them".
   */
  groupIds: z.array(z.coerce.number().int().positive()).max(50).optional()
});

export const cardUpdateSchema = cardCreateSchema.partial();

export const cardIdSchema = z.object({
  id: z.coerce.number().int().positive()
});

/**
 * The local storage cards handed up when someone signs in.
 *
 * Capped because this is one request carrying a whole collection.
 * A box larger than this is past the point where a single round trip is the right shape, and the cap is the honest place to say so rather than timing out mid-merge.
 */
export const cardMergeSchema = z.object({
  cards: z.array(cardCreateSchema).max(2000)
});

export type CardListQuery = z.infer<typeof cardListQuerySchema>;
export type CardCreateInput = z.infer<typeof cardCreateSchema>;
export type CardUpdateInput = z.infer<typeof cardUpdateSchema>;
