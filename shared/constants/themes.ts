/**
 * Themes are named after citrus cultivars, hybrids, and citrus foods. Each
 * theme's primary colour is the actual colour of that fruit or food, so the
 * name carries the colour without needing a preview swatch.
 *
 * The colour scales themselves live in app/assets/css/main.css. This list is
 * what the picker renders and what the preferences route validates against.
 */
export interface ThemeDefinition {
  name: string
  label: string
  mode: 'light' | 'sepia' | 'dark'
  /** Shown as the picker swatch, matching --color-<name>-500 in the CSS. */
  primary: string
  surface: string
  description: string
}

export const THEMES = [
  { name: 'ponkan', label: 'Ponkan', mode: 'light', primary: '#e35205', surface: '#fff6ee', description: '椪柑, deep mandarin orange' },
  { name: 'kumquat', label: 'Kumquat', mode: 'light', primary: '#f58220', surface: '#fff4e6', description: '金桔, brighter small-fruit orange' },
  { name: 'honeybell', label: 'Honeybell', mode: 'light', primary: '#f2a50c', surface: '#fff9e8', description: 'Minneola tangelo' },
  { name: 'meyer', label: 'Meyer', mode: 'light', primary: '#f2c12e', surface: '#fffbea', description: 'Meyer lemon' },
  { name: 'yuzu', label: 'Yuzu', mode: 'light', primary: '#e0ce3f', surface: '#fbfae8', description: 'Pale yellow-green, high acid' },
  { name: 'oroblanco', label: 'Oroblanco', mode: 'light', primary: '#b8ce63', surface: '#f6f9ea', description: 'Pomelo crossed with grapefruit' },
  { name: 'calamansi', label: 'Calamansi', mode: 'light', primary: '#7fa82b', surface: '#f2f7e6', description: 'Green-yellow, Southeast Asian' },
  { name: 'caracara', label: 'Cara Cara', mode: 'light', primary: '#e8735a', surface: '#fdf0ec', description: 'Pink navel, coral flesh' },
  { name: 'chenpi', label: 'Chenpi', mode: 'sepia', primary: '#9c5a2b', surface: '#f5ede0', description: '陈皮, dried aged peel. Reading mode' },
  { name: 'marmalade', label: 'Marmalade', mode: 'dark', primary: '#c4621a', surface: '#1f1711', description: 'Amber preserve on dark glass' },
  { name: 'tarocco', label: 'Tarocco', mode: 'dark', primary: '#c41e3a', surface: '#14100e', description: 'Blood orange, the default dark' },
  { name: 'sanguinello', label: 'Sanguinello', mode: 'dark', primary: '#8e1b2e', surface: '#120d0c', description: 'Deeper blood orange, lower contrast' }
] as const satisfies readonly ThemeDefinition[]

export type ThemeName = typeof THEMES[number]['name']

export const THEME_NAMES = THEMES.map(theme => theme.name) as unknown as [ThemeName, ...ThemeName[]]

export const DEFAULT_THEME: ThemeName = 'ponkan'
