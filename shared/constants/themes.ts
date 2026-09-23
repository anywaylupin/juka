/**
 * Themes are still named after citrus, but the color is now the **vibe the name carries**, not the literal color of the fruit.
 *
 * The old rule, every primary is the real color of that fruit, produced twelve themes spread across roughly sixty degrees of hue.
 * Ponkan, Kumquat, Honeybell and Meyer were four oranges.
 * Naming them after different cultivars did not make them look different.
 *
 * So: Clementine is the blue of the character's hair, not the skin of a clementine.
 * Bergamot is Earl Grey, so it is tea-flower violet.
 * Tarocco is a blood orange, so it is blood.
 * The name still carries the color, it just carries the association rather than the photograph, and the set finally spans the wheel.
 *
 * The color scales live in app/assets/css/themes.css, which is generated from this list by scripts/generate-theme-css.ts.
 * This list is also what the picker renders and what the preferences route validates against.
 */
export interface ThemeDefinition {
  name: string;
  label: string;
  /**
   * Light and dark are literally white and black pages.
   * Sepia is the single exception: chenpi is a reading mode, so it keeps a warm paper page.
   */
  mode: 'light' | 'sepia' | 'dark';
  /** The accent. Shown as the picker swatch, matching --color-<name>-500. */
  primary: string;
  /**
   * The page color, for reading modes only.
   *
   * Light themes are white and dark themes are black, and neither needs to say so.
   * A sepia theme is the exception: paper is the whole point of it, so it names its own.
   */
  page?: string;
  /** One line on where the color comes from. Shown as the swatch tooltip. */
  description: string;
}

export const THEMES = [
  /*
   * Seville is the Claude palette: clay on warm paper.
   * It is a reading mode rather than a light mode, which is why it names a page color, and it is the default because it is the one that is comfortable to sit in front of for an hour.
   *
   * Seville oranges are the bitter ones nobody eats raw and everybody turns into marmalade, which is about the right amount of warmth for the color.
   */
  {
    name: 'seville',
    label: 'Seville',
    mode: 'sepia',
    primary: '#d97757',
    page: '#faf9f5',
    description: 'Clay on warm paper. Reading mode, and the default'
  },
  {
    name: 'ponkan',
    label: 'Ponkan',
    mode: 'light',
    primary: '#e35205',
    description: '椪柑. Deep mandarin orange, the color of its own fruit'
  },
  {
    name: 'tangerine',
    label: 'Tangerine',
    mode: 'light',
    primary: '#f5821f',
    description: 'Straight tangerine orange'
  },
  {
    name: 'clementine',
    label: 'Clementine',
    mode: 'light',
    primary: '#2f6fd0',
    description: "The blue of Clementine's hair, not the peel"
  },
  {
    name: 'meyer',
    label: 'Meyer',
    mode: 'light',
    primary: '#d99e00',
    description: 'Meyer lemon, softened toward honey'
  },
  { name: 'yuzu', label: 'Yuzu', mode: 'light', primary: '#8a9b1f', description: 'Sharp yellow-green, high acid' },
  {
    name: 'calamansi',
    label: 'Calamansi',
    mode: 'light',
    primary: '#2e9153',
    description: 'Southeast Asian green, cut with lime'
  },
  {
    name: 'bergamot',
    label: 'Bergamot',
    mode: 'light',
    primary: '#6b5bd2',
    description: 'Earl Grey. The flower, not the rind'
  },
  { name: 'caracara', label: 'Cara Cara', mode: 'light', primary: '#e0596b', description: 'Pink navel, coral flesh' },
  {
    name: 'pomelo',
    label: 'Pomelo',
    mode: 'light',
    primary: '#0e8f9e',
    description: 'Cool and pale, the quiet one of the family'
  },
  {
    name: 'chenpi',
    label: 'Chenpi',
    mode: 'sepia',
    primary: '#9c5a2b',
    page: '#f7f1e8',
    description: '陈皮, dried aged peel. Darker paper'
  },
  {
    name: 'marmalade',
    label: 'Marmalade',
    mode: 'dark',
    primary: '#e08236',
    description: 'Amber preserve held up to the light'
  },
  {
    name: 'tarocco',
    label: 'Tarocco',
    mode: 'dark',
    primary: '#e0344e',
    description: 'Blood orange. The default dark theme'
  }
] as const satisfies readonly ThemeDefinition[];

export type ThemeName = (typeof THEMES)[number]['name'];

export const THEME_NAMES = THEMES.map((theme) => theme.name) as unknown as [ThemeName, ...ThemeName[]];

export const DEFAULT_THEME: ThemeName = 'seville';
