/**
 * The `ui` prop for every UModal and USlideover: paper, the soft ink shadow and a Song title.
 *
 * One constant passed at the call site rather than a slot override in app.config.ts, which carries colors and button variants only.
 */
export const JUKA_PANEL = {
  content: 'juka-panel',
  title: 'juka-panel-title'
};

/**
 * The `ui` prop for a UCard used as a page section on Progress and Profile: it fills its grid cell, and on a wide screen the body scrolls inside the card so the page itself never does.
 */
export const JUKA_SECTION = {
  root: 'flex min-h-0 flex-col',
  body: 'flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-5'
};
