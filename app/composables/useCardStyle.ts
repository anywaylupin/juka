/**
 * How the character on a card front is drawn: the hand, the practice grid, its size, and whether tones are colored.
 *
 * Kept in a cookie like the flip mode, so the server renders the cards the way they will look and nothing jumps on hydration.
 * It changes how a card is shown, never what is on it.
 */
export type HanziFont = 'kai' | 'song' | 'hei';
export type GridStyle = 'tian' | 'mi' | 'box' | 'none';

export interface CardStyle {
  font: HanziFont;
  grid: GridStyle;
  /** A multiplier on the cell size, so every card size keeps its own proportions. */
  size: number;
  tones: boolean;
}

export const CARD_STYLE_DEFAULTS: CardStyle = { font: 'kai', grid: 'tian', size: 1, tones: false };

/** The size range the slider offers: small enough for a dense gallery, large enough to study strokes. */
export const CARD_SIZE_RANGE = { min: 0.8, max: 1.2, step: 0.05 } as const;

export function useCardStyle() {
  const cookie = useCookie<Partial<CardStyle>>('juka_card_style', {
    default: () => ({ ...CARD_STYLE_DEFAULTS }),
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  });

  /** An older or hand edited cookie may be missing a key, so every read is filled from the defaults. */
  const style = computed<CardStyle>(() => ({ ...CARD_STYLE_DEFAULTS, ...cookie.value }));

  function set<K extends keyof CardStyle>(key: K, value: CardStyle[K]) {
    cookie.value = { ...style.value, [key]: value };
  }

  return { style, set };
}
