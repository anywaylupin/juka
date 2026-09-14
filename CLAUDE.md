# Juka

Juka (橘卡, "mandarin card") is an open source flashcard **storage** app for HSK
learners. It replaces a Notion database that grew too large to maintain by hand.

The mental model is a physical box of flashcards, not a tutor. The user writes
cards, files them, finds them, and hears them. The app does not decide what to
show or when.

Interface languages: English and Vietnamese. Card audio: always Mandarin
(`zh-CN`), never tied to the interface locale.

## Non-goals

Do not build these, and reject scope creep toward them:

- No spaced repetition, no review scheduling, no due dates, no cards due today
- No quiz or test mode beyond revealing the answer on a card
- No AI generation of card content
- No social features, sharing, or public decks
- No mobile native app, a PWA is enough

The storage-only premise is what makes this shippable. If a feature requires an
algorithm deciding what the user sees next, it is out of scope.

## Why it exists

1. Primary: replace the author's Notion flashcard database with something faster
   to add to.
2. Secondary: a portfolio piece. Code quality, README, and the live demo matter
   as much as features.

## Stack

| Layer | Choice |
|---|---|
| Framework | Nuxt 4, Vue 3, `<script setup lang="ts">` |
| UI | Nuxt UI v4 |
| Styling | Tailwind CSS v4, CSS-first config. Do not add UnoCSS, Nuxt UI does not support it |
| Motion | `motion-v` |
| Database | Cloudflare D1 via `drizzle-orm` |
| Object storage | Cloudflare R2, for audio |
| Hosting | Cloudflare Workers, Nitro preset `cloudflare_module` |
| Auth | `nuxt-auth-utils` |
| i18n | `@nuxtjs/i18n`, lazy loaded locale files |
| Validation | `zod` on every server route |
| Stroke animation | `hanzi-writer` and `hanzi-writer-data`, vendored, not from a CDN |
| Pinyin | `pinyin-pro` |
| Segmentation | `segmentit` or `jieba-wasm`, for linking story text to cards |
| Icons | IconPark through `@nuxt/icon` (`i-icon-park-outline-*`) |
| Tests | Vitest and `@nuxt/test-utils` |

Single Nuxt app, flat. Not a monorepo. Plain pnpm. One-off scripts live in
`scripts/`.

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
- `server/utils/` is auto-imported. Do not write manual imports for it.
- Pages use `definePageMeta` and `useSeoMeta`. No raw `useHead` for standard
  metadata.
- Composables are named `useX` and live in `app/composables/`. Keep them free of
  component state assumptions.
- Prefer `useState` for cross-component state. Do not add Pinia without a
  concrete need.
- Components use `defineProps<{}>()` with types, no runtime prop objects.
  Multi-word names. Pages are exempt, their filenames are routes.

## Data model

```sql
users(id, email, created_at)

units(id, user_id, name, order_index, created_at)

cards(
  id, user_id, unit_id,
  hanzi, pinyin, pinyin_plain, han_viet,
  translation, pos, hsk_level,
  status, syllables, notes,
  created_at, updated_at
)

stories(id, user_id, title_zh, title_en, hsk_level, body, is_example, created_at)
story_cards(story_id, card_id)
audio(hanzi_hash, r2_key, voice, created_at)
```

- `status` is one of `difficult | hesitant | good | mastered`. It is a label the
  user sets. It never drives scheduling.
- `syllables` is derived from character count on write, stored so it can be
  filtered without a scan.
- `pinyin_plain` is tone-stripped and lowercased, so typing `jiu` finds 就.
- `han_viet` is nullable.
- `audio` is keyed by content hash, not by card, so identical words across users
  share one file.

### Search

Settled by the spike, written up in [docs/fts5-spike.md](docs/fts5-spike.md).
Read it before touching search.

Short version: **do not use the trigram tokenizer.** It cannot match queries
shorter than three characters, which is most HSK vocabulary, and a two character
`LIKE` against a trigram table is slower than a plain table scan. Use a
per-character FTS5 index instead: a `hanzi_chars` column holding the characters
separated by spaces, searched as a phrase (`match '"时 间"'`). Derive
`hanzi_chars` on write alongside `syllables` and `pinyin_plain`.

Pagination is keyset (`WHERE id > ? LIMIT n`), never `OFFSET`. Pair it with
virtual scrolling on the client.

D1 blocks `sqlite_version()` and `pragma compile_options`. Do not rely on them.

## Audio

Three tiers, built in this order:

1. Web Speech API with a `zh-CN` voice. Zero infrastructure, covers most desktop
   and iOS users.
2. Pre-generated batch. Run Piper (`zh_CN-huayan-medium`) in a GitHub Action over
   the whole HSK vocabulary once, upload to R2, key by hash. A build step, not an
   upload feature.
3. On-demand fallback at `/api/audio/:hash` for words outside the list. Check R2
   first, synthesize and cache on miss.

The audio language is hardcoded `zh-CN`. It is not a user setting and it is not
derived from the i18n locale.

## Han-Viet

The differentiating feature. Every hanzi has a Sino-Vietnamese reading (就 is
tựu, 学 is học, 时间 is thời gian). A Vietnamese learner already knows thousands
of these without realising they map to Chinese characters.

Show `han_viet` on the card face alongside pinyin when the locale is `vi`, and
behind a toggle when it is `en`.

Before implementing, find a permissively licensed Han-Viet character mapping and
record the licence in `docs/licences.md`. Do not scrape.

## Themes

Named after citrus cultivars, hybrids, and citrus foods. Each theme's primary
colour is the actual colour of that fruit, so the name carries the colour.

| Theme | Mode | Primary | Surface | What it is |
|---|---|---|---|---|
| Ponkan | light | `#E35205` | `#FFF6EE` | 椪柑, the default. Deep mandarin orange |
| Kumquat | light | `#F58220` | `#FFF4E6` | 金桔, brighter small-fruit orange |
| Honeybell | light | `#F2A50C` | `#FFF9E8` | Minneola tangelo |
| Meyer | light | `#F2C12E` | `#FFFBEA` | Meyer lemon |
| Yuzu | light | `#E0CE3F` | `#FBFAE8` | Pale yellow-green, high acid |
| Oroblanco | light | `#B8CE63` | `#F6F9EA` | Pomelo x grapefruit |
| Calamansi | light | `#7FA82B` | `#F2F7E6` | Green-yellow, Southeast Asian |
| Cara Cara | light | `#E8735A` | `#FDF0EC` | Pink navel, coral flesh |
| Chenpi | sepia | `#9C5A2B` | `#F5EDE0` | 陈皮, dried aged peel. Reading mode for stories |
| Marmalade | warm dark | `#C4621A` | `#1F1711` | Amber preserve on dark glass |
| Tarocco | dark | `#C41E3A` | `#14100E` | Blood orange, the default dark theme |
| Sanguinello | dark | `#8E1B2E` | `#120D0C` | Deeper blood orange, lower contrast |

Implementation:

- Each theme is a Tailwind v4 `@theme static` colour scale in
  `app/assets/css/main.css`.
- Switch through `app.config.ts` `ui.colors.primary` plus a `data-theme`
  attribute on `<html>`.
- Neutral is `taupe` in light modes and a warm dark in dark modes. Never stock
  grey, it reads cold against every colour in this palette.
- Persist the choice per user in the database, not only in localStorage.

**Card status colours are fixed and do not change with the theme.** They are a
ripening scale and their meaning must stay stable:

| Status | Colour | Reading |
|---|---|---|
| Difficult | `#7A9A3C` | unripe |
| Hesitant | `#C9BA2E` | turning |
| Good | `#E8A317` | gold |
| Mastered | `#2F7D52` | leaf, deliberately off the fruit scale |

Never use a theme's primary colour for a card status. The user must be able to
tell a button from a state.

## Look and feel

Target the register of Duolingo and Memrise: friendly, chunky, responsive to
touch. Nuxt UI's defaults are clean SaaS, so push them.

- Large radius tokens, generous touch targets.
- The 3D press button is `border-b-4` plus `active:border-b-0
  active:translate-y-1`, applied once through the Nuxt UI theme override in
  `app.config.ts` rather than per component.
- `motion-v` springs on card flip, status change, and unit completion.
- Progress indicator: a tangerine drawn as a ring of segments that fill as cards
  in a unit reach mastered, each segment carrying its own ripeness colour. One
  SVG, legible at 24px in a list row and at 200px on a unit page.
- Typography: a rounded geometric sans for Latin text, LXGW WenKai for hanzi. Not
  Noto Sans SC.

### Writing style in the interface

- Sentence case everywhere. No title case.
- Use short hyphens. Never em dashes or en dashes, in any user-facing copy, code
  comment, commit message, or documentation.
- Active voice, verb first. "Add card", not "Card addition".
- No exclamation marks in system copy.

## Build order

1. ~~Nuxt scaffold, Cloudflare Workers deploy, D1 and R2 bindings wired, one
   route proving the database connection works end to end.~~ Done.
2. ~~FTS5 trigram spike. Settle the search design.~~ Done, see
   `docs/fts5-spike.md`.
3. Schema and drizzle migrations.
4. **Notion importer, run against the real database.** Do this before any UI.
   Real data exposes schema problems that seed data hides.
5. Card list with keyset pagination and virtual scroll. Search.
6. Card detail, create, edit. Status setting.
7. Web Speech audio.
8. hanzi-writer stroke animation on the card face.
9. Themes and i18n.
10. Stories, with one seeded example. Do not copy text from any existing graded
    reader, it is copyrighted.
11. Han-Viet column populated.
12. Piper batch generation and R2 fallback.

Keep Notion running in parallel until the app has been used daily for two weeks.

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
