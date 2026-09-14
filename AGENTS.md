# Working rules for coding agents

How to work in this repository. The product brief, the data model, and the
build order live in [CLAUDE.md](CLAUDE.md), which imports this file.

## Stack

| Layer | Choice |
|---|---|
| Framework | Nuxt 4, Vue 3, `<script setup lang="ts">` |
| UI | Nuxt UI v4 |
| Styling | Tailwind CSS v4, CSS-first config. Do not add UnoCSS, Nuxt UI does not support it |
| Motion | `motion-v` |
| Database | Cloudflare D1 via `drizzle-orm` |
| Object storage | Cloudflare R2, for audio |
| Dictionary | CC-CEDICT joined with jieba frequencies, vendored into `public/dict` |
| Local store | `localStorage` when signed out, through `useCardStore` and `useGroups` |
| Translation | Cloudflare Workers AI, binding `AI`. English gloss to Vietnamese only |
| Hosting | Cloudflare Workers, Nitro preset `cloudflare_module` |
| Auth | `nuxt-auth-utils` |
| i18n | `@nuxtjs/i18n`, lazy loaded locale files |
| Validation | `zod` on every server route |
| Stroke animation | `hanzi-writer` and `hanzi-writer-data`, vendored, not from a CDN |
| Pinyin | `pinyin-pro` |
| Segmentation | `segmentit` or `jieba-wasm`, for linking story text to cards |
| Icons | IconPark and Lucide through `@nuxt/icon`, plus `circle-flags` for languages |
| Tests | Vitest and `@nuxt/test-utils` |

Single Nuxt app, flat. Not a monorepo. Plain pnpm. One-off scripts live in
`scripts/`.

## Commands

```bash
pnpm dev                  # real D1 and R2 bindings through Nitro's Cloudflare dev emulation
pnpm test                 # vitest run
pnpm lint                 # eslint
pnpm typecheck            # vue-tsc
pnpm db:generate          # drizzle-kit generate, after editing server/database/schema.ts
pnpm db:migrate:local     # apply migrations to .wrangler/state/v3
pnpm db:migrate:remote    # apply migrations to the deployed D1
node scripts/generate-theme-css.ts   # rewrite app/assets/css/themes.css
pnpm dict:build           # rebuild public/dict from CC-CEDICT and jieba
node scripts/build-favicon.ts        # rewrite public/favicon.svg from the icon set
```

`pnpm dict:build` downloads roughly 9 MB from mdbg.net and raw.githubusercontent.com
and takes about a minute. The output is committed, so it only needs running when
the sources change. Pass `--cedict` and `--jieba` to build from local copies.

**A fresh clone has an empty local database.** `pnpm db:migrate:local` is not
optional: without it every route returns 500 and the interface renders as an
empty card box rather than an error, because a failed list looks the same as an
empty one. Run it before reporting a bug about saving.

## Conventions

- Data fetching in components uses `useFetch` or `useAsyncData`. `$fetch` only
  inside event handlers, callbacks, and server code. Never bare `$fetch` in
  setup, it double-fetches on hydration.
- Every server route is a `defineEventHandler` with `getValidatedQuery` or
  `readValidatedBody` and a zod schema. No unvalidated input reaches the
  database.
- Shared request and response types live in `shared/types`, zod schemas in
  `shared/schemas`, imported by both the route and the component. No `any`.
- Config through `useRuntimeConfig()`, never `process.env` in app code.
- D1 and R2 bindings come from `event.context.cloudflare.env` and are wrapped in
  `server/utils/db.ts` and `server/utils/storage.ts`. Handlers never touch the
  raw env. Use `useDrizzle(event)` and `useAudioBucket(event)`.
- Every card route calls `requireUserId(event)`, which throws a 401 when signed
  out. There is no fallback owner. A signed out visitor's cards are in local
  storage and never touch these routes.
- Components never branch on signed in versus signed out to find cards or
  groups. They ask `useCardStore` and `useGroups`, which are the only two places
  that know. Anything new that persists needs the same shape.
- **Local storage has no migrations, so the read is the migration.** D1 gets a
  numbered SQL file whenever a column appears; a browser still holds whatever
  shape an earlier release wrote. Everything read out of local storage goes
  through `shared/utils/normalise.ts`, which fills in missing fields, coerces
  wrong types, recomputes derived columns and drops entries it cannot read.
  Never cast a parsed blob straight to a record type: adding `groupIds` in
  migration 0007 crashed the whole page for anyone with older cards, because
  seven call sites called `.map` or `.includes` on a field that was undefined.
  Add a field to `CardRecord` and you add a default here in the same change.
- **`v-on="handlers"` runs Vue's `toHandlers()`, which prefixes every key with
  `on`.** So the object's keys must be bare event names (`pointerdown`), not
  `onPointerdown`. Getting this wrong binds to an event that does not exist and
  fails completely silently: it is what left the stack view with no swipe and no
  tap-to-flip for a whole release.
- `server/utils/` is auto-imported. Do not write manual imports for it.
- Pages use `definePageMeta` and `useSeoMeta`. No raw `useHead` for standard
  metadata.
- Composables are named `useX` and live in `app/composables/`. Keep them free of
  component state assumptions.
- Prefer `useState` for cross-component state. Do not add Pinia without a
  concrete need.
- Components use `defineProps<{}>()` with types, no runtime prop objects.
  Multi-word names. Pages are exempt, their filenames are routes.
- A failed fetch must render as a failure. Never let an error path fall through
  to the empty state.

## Styling rules

**Use Nuxt UI as it comes.** The app went through a phase of overriding
component slots, adding a 3D press, a raised panel class and a page gradient,
and putting a border on everything. It read as heavy and made problems hard to
place, because a wrong border could have come from the theme, the slot override,
or the component itself. That is all gone. Do not add it back without a reason
that has survived a week of use.

- `app.config.ts` carries **colours only**. No component slot overrides. If one
  component needs to look different, say so at the call site; promote it only
  once the pattern has repeated.
- `app/assets/css/main.css` is deliberately tiny: font stacks, the rating
  colour, the page background, and a focus ring. Add to it only when a component
  cannot be styled through the theme.
- A theme sets the accent and nothing else. Surfaces, borders and text come from
  Nuxt UI. Read them through the semantic classes (`bg-default`, `bg-muted`,
  `bg-elevated`, `text-muted`, `text-highlighted`, `border-default`), never by
  writing `var(--ui-bg)` inline.
- The page is plain white in light themes and plain black in dark ones. Chenpi
  is the one exception, because it is a reading mode.
- **Icons come from the installed sets** (`i-icon-park-outline-*`, or lucide
  where IconPark has no equivalent). Never hand write SVG path data. The favicon
  is generated from the same set by `node scripts/build-favicon.ts`.
- The rating colour is fixed across every theme. Never use a theme accent for a
  rating, and never use the rating colour for a button.
- Interactive elements need a visible `:focus-visible` ring. The app is used
  one-handed and keyboard-first.

## Writing style in the interface

- Sentence case everywhere. No title case.
- Use short hyphens. Never em dashes or en dashes, in any user-facing copy,
  code comment, commit message, or documentation.
- Active voice, verb first. "Add card", not "Card addition".
- No exclamation marks in system copy.

## Local development notes

- `pnpm dev` gets real bindings through Nitro's built-in Cloudflare dev
  emulation. `nitro-cloudflare-dev` is not needed and is not installed. This
  requires `compatibilityDate` to stay at or after 2025-07-15.
- `wrangler.jsonc` at the root deliberately has no `main` and no `assets`. Nitro
  fills those in and writes the deployable config to
  `.output/server/wrangler.json`, pointed at by `.wrangler/deploy/config.json`.
  Declaring them at the root gets them ignored with a warning.
- The root `wrangler.jsonc` is still what `wrangler d1` commands and the dev
  binding proxy read, so bindings belong there.
- Local D1 state lives in `.wrangler/state/v3` and is shared between `pnpm dev`
  and `wrangler d1 execute --local`.
- **Migration SQL is usually hand written here, and that is deliberate.**
  `drizzle-kit generate` rebuilds a table through a `__new_x` copy and a
  `DROP TABLE`, which silently takes the three `cards_fts` triggers with it and
  leaves the search index mirroring nothing. It also emits `PRAGMA foreign_keys`,
  which D1 rejects inside a transaction. Generate the migration for its snapshot,
  then read the SQL and replace it if it rebuilds `cards`. Migrations 0002 and
  0006 show the pattern: defer foreign keys, drop and recreate the triggers
  around the rebuild, and rebuild the FTS index afterwards.
- Drizzle prompts interactively when one table is created and another dropped in
  the same diff, which fails in a non-TTY shell. Split the change into two
  `generate` runs.

## Repo hygiene

- The README is the portfolio piece. Most people will spend ninety seconds on it
  and never open a source file. It needs screenshots, a short recording of a card
  flipping with the stroke animation, a live demo link, and an architecture
  section explaining the D1 and R2 choices. The Han-Viet angle stays near the top.
- Licence records live in `docs/licences.md`. The `hanzi-writer` data is under
  the Arphic Public License, which expects an attribution notice, so the README
  notice must not be dropped.
- Conventional commits.
- Release codenames follow the citrus theme: Ponkan 0.1, Murcott 0.2, Tankan 0.3.
  Package and directory names stay descriptive, not fruit-named.
