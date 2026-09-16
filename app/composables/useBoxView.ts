/**
 * Which way the box is open, remembered per browser.
 *
 * A cookie rather than local storage, so the server renders the same view the client is about to and the layout does not jump on hydration.
 */
export type BoxView = 'gallery' | 'stack' | 'chart';

const VIEWS: BoxView[] = ['gallery', 'stack', 'chart'];

export function useBoxView() {
  const cookie = useCookie<BoxView>('juka_view', {
    default: () => 'gallery',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  });

  // An older cookie may hold 'box', which was the edge-on deck this replaced.
  if (!VIEWS.includes(cookie.value)) {
    cookie.value = 'gallery';
  }

  return cookie;
}

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
