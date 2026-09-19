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

/**
 * Lowercased, because an address is not case sensitive in practice and a unique index is.
 * Optional everywhere, and an empty field means "no address" rather than a validation error.
 */
export const emailSchema = z.string().trim().toLowerCase().email('That does not look like an email address').max(200);

/**
 * An address, no address, or the field left out entirely.
 *
 * `.optional()` has to come last. Wrapped the other way round the transform also runs for a missing key, so "I did not send an email field" arrives as "set the email to null", and renaming an account quietly deletes its address.
 */
const optionalEmail = z
  .union([emailSchema, z.literal(''), z.null()])
  .transform((value) => value || null)
  .optional();

/**
 * A new password is always typed twice.
 *
 * It is the one field nobody can read back to check, and getting it wrong on a new account means being locked out of something you have not used yet, which reads as the app losing your work.
 */
const confirmed = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object(shape)
    .refine(
      (value) =>
        (value as { password?: string; confirmPassword?: string }).password === undefined ||
        (value as { password?: string; confirmPassword?: string }).password ===
          (value as { confirmPassword?: string }).confirmPassword,
      { message: 'The two passwords do not match', path: ['confirmPassword'] }
    );

export const registerSchema = confirmed({
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  /** Optional at sign-up, and addable later from account settings. */
  email: optionalEmail
});

export const loginSchema = z.object({
  /**
   * A username or an email address, whichever the person remembers.
   * Not the strict username schema: an address has characters a username may not, and the route decides which one it is.
   */
  identifier: z.string().trim().toLowerCase().min(1, 'Enter your username or email').max(200),
  // Not the strict password schema either: an old password that no longer meets the rules must still be able to sign in, otherwise tightening the rules locks people out.
  password: z.string().min(1, 'Enter your password').max(200)
});

/**
 * Everything on an account is changeable, one field or all of them, at any time.
 *
 * `currentPassword` is required only when this account already has a password, which the route knows and the client does not have to guess.
 */
export const profileUpdateSchema = confirmed({
  username: usernameSchema.optional(),
  email: optionalEmail,
  password: passwordSchema.optional(),
  confirmPassword: z.string().optional(),
  currentPassword: z.string().max(200).optional()
});

/** Asking for a reset link. The answer is the same whether or not the account exists. */
export const passwordResetRequestSchema = z.object({
  identifier: z.string().trim().toLowerCase().min(1, 'Enter your username or email').max(200)
});

/** Spending a reset link. */
export const passwordResetSchema = confirmed({
  token: z.string().min(16).max(200),
  password: passwordSchema,
  confirmPassword: z.string()
});

export const unlinkProviderSchema = z.object({
  provider: z.string().trim().toLowerCase().min(2).max(32)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
