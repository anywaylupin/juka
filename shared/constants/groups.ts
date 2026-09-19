/**
 * The groups a new box starts with.
 *
 * HSK bands, because that is the division every learner of this language already has in their head, and because an empty grouping feature reads as a feature nobody finished: the first card has nowhere to go and the panel is a blank page with a plus on it.
 *
 * They are an example, not a schema. Rename them, recolour them, delete them, or ignore them and make thirty of your own: nothing in the app treats these six as different from a group called "words from the news".
 * The colours run warm to cool across the six, so a box sorted by band reads as a gradient rather than as six unrelated dots.
 */
export const DEFAULT_GROUPS = [
  { name: 'HSK 1', colour: '#e35205' },
  { name: 'HSK 2', colour: '#f5821f' },
  { name: 'HSK 3', colour: '#d99e00' },
  { name: 'HSK 4', colour: '#2e9153' },
  { name: 'HSK 5', colour: '#0e8f9e' },
  { name: 'HSK 6', colour: '#2f6fd0' }
] as const;
