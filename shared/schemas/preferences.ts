import { z } from 'zod';
import { THEME_NAMES } from '../constants/themes';

export const preferencesUpdateSchema = z.object({
  theme: z.enum(THEME_NAMES)
});

export type PreferencesUpdateInput = z.infer<typeof preferencesUpdateSchema>;
