/**
 * Whether the gallery turns one card at a time or all of them together.
 *
 * One at a time is for testing yourself: every other card stays face down while you check one.
 * All together is for reading back through what you have.
 */
export type FlipMode = 'single' | 'all';

export function useFlipMode() {
  return useCookie<FlipMode>('juka_flip', {
    default: () => 'single',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  });
}
