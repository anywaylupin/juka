import { z } from 'zod';

/**
 * Usernames are lowercased on write, so Lupin and lupin are the same account rather than two accounts one typo apart.
 * The character set is deliberately narrow: it goes in a greeting and nowhere else, so there is no reason to allow anything that needs escaping.
 */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username needs at least 3 characters')
  .max(32)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, 'Use letters, numbers, dot, dash or underscore');

/**
 * Long rather than complicated.
 * Character class rules push people toward Passw0rd! and nothing else, so the only rule here is length.
 */
export const passwordSchema = z.string().min(8, 'Password needs at least 8 characters').max(200);

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  /** Optional, and it stays optional. Nothing in the app emails you. */
  email: z
    .string()
    .trim()
    .email()
    .max(200)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null))
});

export const loginSchema = z.object({
  username: usernameSchema,
  // Not the strict schema: an old password that no longer meets the rules must still be able to sign in, otherwise tightening the rules locks people out.
  password: z.string().min(1, 'Enter your password').max(200)
});

export const profileUpdateSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(200)
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  password: passwordSchema.optional(),
  /** Required when changing the password, ignored otherwise. */
  currentPassword: z.string().max(200).optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
