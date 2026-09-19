import type { H3Event } from 'h3';

/**
 * Password reset tokens: making them, hashing them, and building the link they travel in.
 *
 * The token is random rather than derived, stored as a hash rather than as itself, and short lived.
 * Those three together are what make a leaked database not a set of working links into every account.
 */

/** An hour. Long enough to find the email, short enough that a forwarded one goes stale. */
export const RESET_LIFETIME = 60 * 60 * 1000;

/** 32 bytes of randomness, hex encoded. Guessing one is not a thing that happens. */
export function createResetToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256, through the Web Crypto API that both Workers and Node provide.
 *
 * A password needs a slow hash because it is short and guessable; a 256 bit random token does not, and a fast hash keeps the lookup a single indexed read.
 */
export async function hashResetToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Where the link points.
 *
 * The public site URL is configured rather than read from the request, because a Host header is attacker controlled and this link is the one thing in the app that must not be redirected somewhere else.
 * Without the setting it falls back to the request origin, which is right in development and is why development needs no configuration at all.
 */
export function resetUrl(event: H3Event, token: string): string {
  const configured = useRuntimeConfig(event).public.siteUrl;
  const origin = configured || getRequestURL(event).origin;

  return `${origin.replace(/\/$/, '')}/reset?token=${token}`;
}
