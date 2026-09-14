# Juka

@AGENTS.md

Juka (橘卡, "mandarin card") is an open source flashcard **storage** app for HSK
learners. It replaces a Notion database that grew too large to maintain by hand.

The mental model is a physical box of flashcards, not a tutor. The user writes
cards, files them, finds them, and hears them. The app does not decide what to
show or when.

Interface languages: English and Vietnamese. Card audio: always Mandarin
(`zh-CN`), never tied to the interface locale.

## Non-goals

Do not build these, and reject scope creep toward them:

- No spaced repetition, no review scheduling, no due dates, no cards due today.
  **One deliberate exception**, added at the author's request: the stack view's
  practice order deals weakly known cards more often. It is a weighted shuffle,
  not a schedule. There is no due date, no interval, and no memory of when a
  card was last seen, it applies only in that view, and reloading gives a
  different order. If anything here ever grows a notion of *when*, it has
  crossed the line this bullet is drawing
- No quiz or test mode beyond revealing the answer on a card
- **No AI writing a card.** The reading, the meaning, the part of speech and the
  synonyms are all lookups in the bundled dictionary, not guesses. A model is
  used for exactly one thing: translating an English gloss into Vietnamese,
  because no licensable Chinese to Vietnamese dictionary of usable quality
  exists (the numbers are in `docs/licences.md`). It never invents a meaning,
  only restates one, it is cached per word, and every failure leaves the English
  standing. Workers AI was also once used for the HSK band and near synonyms;
  both were removed in migration 0006 and should not come back
- No social features, sharing, or public decks
- No mobile native app, a PWA is enough

The storage-only premise is what makes this shippable. If a feature requires an
algorithm deciding what the user sees next, it is out of scope.

## Why it exists

1. Primary: replace the author's Notion flashcard database with something faster
   to add to.
2. Secondary: a portfolio piece. Code quality, README, and the live demo matter
   as much as features.

## Data model

```sql
users(id, username, password_hash, email, theme, rating_labels, created_at)

cards(
  id, user_id,
  hanzi, pinyin, pinyin_plain, hanzi_chars, pinyin_search, han_viet,
  translation, pos,
  rating, syllables, notes,
  created_at, updated_at
)

groups(id, user_id, name, colour, order_index, created_at)
card_groups(card_id, group_id)
translations(hanzi, locale, text, model, created_at)

stories(id, user_id, title_zh, title_en, hsk_level, body, is_example, created_at)
story_cards(story_id, card_id)
audio(hanzi_hash, r2_key, voice, created_at)
```

- **Groups are the third attempt at dividing the box, and the first that works.**
  Units were one-per-card folders, removed in migration 0002 because a card had
  to be filed somewhere. Groups are many-to-many and optional: a card can be in
  none, and being in two is not a conflict. The user names them, colours them,
  and deleting one removes a label rather than a card.
- **One card per word per owner**, enforced by a unique index on
  `(user_id, hanzi)` as well as by a check in the route. A box with 时间 in it
  twice is a box you stop trusting, and the merge on sign-in leans on this to
  decide what to skip.
- `rating` is 0 to 5, drawn as a row of mandarins, where 0 means unrated. The
  five levels are **named**: new, difficult, hesitant, good, mastered. The names
  are the user's to change, stored in `users.rating_labels` as JSON, and default
  to the current locale's wording rather than to English. Vietnamese defaults to
  mới, khó, lưỡng lự, khá and thuộc, which are the words a Vietnamese learner
  uses rather than translations of the English ones.
- `syllables` is derived from character count on write, stored so it can be
  filtered without a scan.
- `pinyin_plain` is tone-stripped and lowercased, so typing `jiu` finds 就.
- `han_viet` is nullable, and only ever shown when the locale is `vi`.
- **There is no `hsk_level` and no `insights` table.** Both were dropped in
  migration 0006 along with the Workers AI binding. The bundled dictionary
  answers the reading, the meaning and the part of speech, which left nothing
  for a model to say, and the app now has no model in it at all.
- `email` is optional and unused. Nothing in the app emails anyone.

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

## Writing a card

One field. Type pinyin or hanzi into the big field in the middle of the card
shaped modal, and the reading, the meaning, the part of speech, the character
count and the search index all fill themselves in.

**The meaning and the part of speech are not inputs.** They are looked up, so
they are displayed on the card rather than offered as boxes to fill in and get
wrong. What is left for the user is the rating and the note.

### The bundled dictionary

`public/dict` is generated by `scripts/build-dictionary.ts` from three sources,
because none is enough alone:

- **CC-CEDICT** has readings and English meanings, and no frequency data at all.
  Ranked without it, typing `shijian` offers 世间, 事件, 始建, 实践 and 尸检
  before it offers 时间, which makes the feature worse than not having it.
- **jieba's `dict.txt`** has a frequency and a part of speech tag for 349,000
  words, and no readings or definitions.
- **Unihan** has the Sino-Vietnamese reading, keyed on traditional characters,
  so `kTraditionalVariant` bridges it to the simplified forms this app stores.

Joined on the simplified form they give a candidate list ranked the way a
learner expects. Output is sharded by first pinyin syllable, so typing `shi`
fetches one file of a few dozen kilobytes rather than the whole dictionary, and
the syllable table is derived from the source rather than hand written.

**Synonyms come out of the same join, not out of a model.** Two words carrying
the same English gloss mean close to the same thing, so grouping by normalised
gloss and reading the groups back gives a synonym list for 61% of the
dictionary. Two guards make it usable: cross references like "variant of" are
cut by pattern (that one gloss alone groups 2,432 words), and a gloss shared by
more than 120 words is a grammatical note rather than a meaning. Both numbers
were tuned against real output: caps of 12 and 40 each threw away "happy" and
"beautiful" for being too popular, which is the opposite of the intent.

**The licences differ from the app's.** CC-CEDICT is CC BY-SA 4.0, which is
ShareAlike, so everything in `public/dict` is CC BY-SA and not MIT. The notice
in `public/dict/LICENCE.txt` must not be dropped.

### Vietnamese meanings

Machine translated from the English gloss by Workers AI, cached per word in
`translations`, and only under the Vietnamese locale. It is a translation of a
translation and is offered on that basis.

This is a last resort, not a first choice. Two licensable sources were measured
and rejected: Vietnamese Wiktionary covers 8.4% of common words and glosses 癌
"cancer" as squirrel monkey, and the Chinese-Vietnamese dictionaries on GitHub
carry no licence at all. `docs/licences.md` has the numbers so nobody repeats
that search.

The route is behind a session, because it spends an inference and writes a
shared cache. Signed out, the English gloss simply stands.

## Accounts and storage

**The app works signed out.** That is the default state, not a degraded one.

- Signed out, the box is `localStorage`. Local card ids are negative, so they
  can never collide with an account's.
- Signed in, the box is the account, read through the keyset paginated route.
- `useCardStore` is the only thing that knows which. Everything else asks it,
  so there is one code path for a card list rather than two that drift.

Signing in offers a **one-time additive merge**: local cards are copied up, a
word already on the account is skipped rather than overwritten, and **the local
copy is never deleted**. That last part is what makes signing out safe: it drops
back to exactly the cards that were there before.

There is no continuous sync, no conflict resolution and no tombstones, on
purpose. That machinery earns its place when two devices write at once, which
is not what a single-owner card box does.

Auth is username and password through `nuxt-auth-utils`, scrypt via
`hashPassword`. Email is optional and unused. `requireUserId` returns a 401
rather than falling back to an owner: a signed out visitor never calls a card
route at all.

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

Show `han_viet` on the card face alongside pinyin **only when the locale is
`vi`**. There is no toggle. One existed in the header and was removed: for an
English reader it revealed a column with no data in it, which is a control that
does nothing most of the time for most people.

The mapping comes from **Unihan's `kVietnamese`** field, built into the
dictionary so a card gets its reading at the same moment it gets its meaning.
The licence is recorded in `docs/licences.md`.

**It covers 52% of the dictionary, and the gap is not the rare words.** Unicode
marks `kVietnamese` provisional, and it has no entry for characters as common as
时, 就, 很, 咖 and 啡. So 学习 resolves to học tập and 时间 resolves to nothing,
even though thời gian is the example this very section opens with.

A word gets a reading only when **every** character resolves. A partial reading
looks like data and a reader cannot tell which half to trust. Where there is no
reading the field is left blank and stays editable, which is the only field on
the card a Vietnamese reader may still have to write by hand.

Two other sources were measured and rejected, and the numbers are in
`docs/licences.md` so nobody re-runs that search. Do not scrape.

## Themes

Named after citrus, but the colour is the **vibe the name carries**, not the
literal colour of the fruit.

The old rule, every primary is the real colour of that fruit, produced twelve
themes spread across sixty degrees of hue. Ponkan, Kumquat, Honeybell and Meyer
were four oranges, and naming them after different cultivars did not make them
look different. So Clementine is the blue of the character's hair, Bergamot is
Earl Grey rather than rind, and Tarocco is blood.

| Theme | Mode | Primary | Where the colour comes from |
|---|---|---|---|
| Seville | sepia | `#D97757` | **The default.** Claude's clay on warm paper |
| Ponkan | light | `#E35205` | 椪柑. Deep mandarin orange |
| Tangerine | light | `#F5821F` | Straight tangerine orange |
| Clementine | light | `#2F6FD0` | The blue of Clementine's hair, not the peel |
| Meyer | light | `#D99E00` | Meyer lemon, softened toward honey |
| Yuzu | light | `#8A9B1F` | Sharp yellow-green, high acid |
| Calamansi | light | `#2E9153` | Southeast Asian green, cut with lime |
| Bergamot | light | `#6B5BD2` | Earl Grey. The flower, not the rind |
| Cara Cara | light | `#E0596B` | Pink navel, coral flesh |
| Pomelo | light | `#0E8F9E` | Cool and pale, the quiet one |
| Chenpi | sepia | `#9C5A2B` | 陈皮, dried aged peel. Darker paper |
| Marmalade | dark | `#E08236` | Amber preserve held up to the light |
| Tarocco | dark | `#E0344E` | Blood orange. The default dark theme |

Implementation:

- **A theme sets the accent and nothing else.** Surfaces, borders and text come
  from Nuxt UI's defaults. An earlier version generated fifteen semantic tokens
  per theme, which meant twelve hand tuned palettes to keep in balance.
- **The page is plain white in light modes and plain black in dark ones.** A
  reading mode is the exception and names its own paper colour, which is the
  only reason `ThemeDefinition.page` exists.
- Generated into `app/assets/css/themes.css`. Edit `shared/constants/themes.ts`
  and run `node scripts/generate-theme-css.ts`.
- Neutral is one warm taupe shared by every theme. Never stock grey.
- The cookie is the source of truth for rendering, because it is the only thing
  readable during SSR. A signed in account mirrors it so the choice follows you
  to another browser.

**The rating mandarin is one fixed colour, `#F5821F`, across every theme.** A
five step colour ramp would be five things to learn where the count is already
the whole message, and borrowing the theme accent would make a rating look like
a button. The user has to be able to tell a button from a state.

## Look and feel

**Nuxt UI's defaults, used as they come.** Rings, focus states and surfaces are
Nuxt UI's own. The one override is the colour of the focus ring on a text field,
which Nuxt UI paints in the accent and which reads as an orange glow on a warm
palette; it is swapped to neutral and the extra translucent outline is dropped.
That is a colour correction, not a bespoke effect, and it is the only entry in
`app.config.ts` besides the palette.

Do not add a 3D press, a raised panel class, or a page gradient back. That was
tried and removed: it read as heavy and made problems hard to place, because a
wrong border could have come from the theme, a slot override, or the component.

The metaphor is a real box of index cards, and the layout is built around that
rather than around a dashboard:

- **The top bar does the work.** View, filters, add, theme, language and account
  all live on one line, so the page below is nothing but cards. Icons with
  tooltips, never labels.
- **Gallery** is the browse view: the whole box laid out, paged. A toggle in the
  top bar decides whether turning one card turns the last one back (for testing
  yourself) or cards turn independently (for reading back through them). An
  edge-on deck was tried in between and removed: it looked like a card box and
  was miserable to read, because a vertical word in a 44px spine tells you
  almost nothing.
- **Stack** is the one-at-a-time view. The top card follows your finger: right
  keeps it and moves on, left bins it with an undo, up or down turns it over,
  and a tap turns it over too. Two cards are drawn behind for depth, and the
  arrows sit beside the card rather than under it. Its order comes from
  `usePracticeOrder` unless practice mode is switched off.
- **Chart** is the box from above: a ripeness bar across the five named levels,
  a calendar heatmap of cards added per day, and a split by word type and by
  group. Built from divs, not SVG and not a charting library, because everything
  on it is a proportion or a count.
- **A card shows only the hanzi on the front.** The back carries the reading,
  the meaning and the part of speech, and nothing else. There is no flip button:
  clicking the card turns it.
- Each card's action bar sits in the **top left corner**, the way a real card
  has a corner you write on: audio, edit, delete. The rating sits at the foot.
- **Part of speech has its own colour**, fixed across every theme, on the card,
  on the spine, and in the filter. `PART_OF_SPEECH_COLOURS` in
  `shared/constants/pos.ts`.
- **Filters are grouped**, not one long rail: how well you know it, word type,
  and length. Each group is multi-select with per-option counts, so a filter
  that would empty the box says so before it is pressed.
- **One add button in the app**, in the top bar.
- Icons come from the installed sets. Never hand write path data. The favicon is
  lifted from the same set by `scripts/build-favicon.ts`, and the language
  picker uses `circle-flags`.

## Build order

1. ~~Nuxt scaffold, Cloudflare Workers deploy, D1 and R2 bindings, one route
   proving the database connection works end to end.~~ Done.
2. ~~FTS5 trigram spike. Settle the search design.~~ Done, see
   `docs/fts5-spike.md`.
3. ~~Schema and drizzle migrations.~~ Done, including `cards_fts` and its
   triggers.
4. ~~Notion importer.~~ Skipped at the author's request.
5. ~~Card list with pagination and search.~~ Done, keyset.
6. ~~Card create and edit.~~ Done.
7. ~~Web Speech audio.~~ Done, tier one only.
8. ~~Units.~~ Built, then removed in migration 0002. Do not reintroduce them.
9. ~~Themes and i18n.~~ Done, thirteen themes.
10. ~~Workers AI for the HSK band.~~ Built, then removed in migration 0006. The
    app has no model in it. Do not reintroduce one.
11. ~~Bundled dictionary, so the hanzi field accepts pinyin and fills the card.~~
    Done, see `scripts/build-dictionary.ts`.
12. ~~Rating as five mandarins, replacing the four named statuses.~~ Done.
13. ~~Card box and stack views, drag gestures, grouped filters.~~ Done.
14. ~~Accounts, and local storage for signed out use with a merge on sign-in.~~
    Done, migration 0006.
15. ~~Groups, customisable rating names, gallery and chart views, synonyms,
    Vietnamese meanings.~~ Done, migration 0007.
16. hanzi-writer stroke animation on the card face. **Not started, and it needs a
    decision first:** `hanzi-writer-data` ships about 9,000 JSON files. Bundling
    them all through Vite is not viable, and the brief forbids a CDN, so the data
    has to be vendored into `public/` by a build step or narrowed to the
    characters actually in use.
17. Stories, with one seeded example. Do not copy text from any existing graded
    reader, it is copyrighted.
18. Han-Viet for the half Unihan does not cover. The column is populated from
    Unihan already; what is missing is a second licensed source for the common
    characters it omits.
19. Piper batch generation and R2 fallback.

Keep Notion running in parallel until the app has been used daily for two weeks.

## Current state

- **Auth is real.** Username and password through `nuxt-auth-utils`, scrypt
  hashing, sessions in a signed cookie. `requireUserId` returns a 401 rather
  than falling back to an owner; the bootstrap owner row from migration 0001 was
  removed in 0006. Signed out visitors never reach a card route, because their
  cards are in local storage.
- **Theme colours are generated.** `app/assets/css/themes.css` is written by
  `node scripts/generate-theme-css.ts` from `shared/constants/themes.ts`. Edit
  the constants and regenerate, never the CSS.
- **Derived card fields have one home.** `deriveCardFields` in
  `server/utils/card-fields.ts` produces `pinyin`, `pinyin_plain`, `hanzi_chars`,
  `pinyin_search`, and `syllables`. Nothing else may write those columns.
- **Search input never reaches FTS5 as syntax.** `buildSearchMatch` extracts only
  Han runs and alphanumeric runs, so quotes and operators are dropped.
- **The model does one job.** Workers AI translates an English gloss into
  Vietnamese and nothing else. Everything a card knows about a word comes from
  the bundled dictionary. The binding is declared in `nuxt.config.ts` under
  `nitro.cloudflare.wrangler`, never in `wrangler.jsonc`, because an `ai` block
  there makes miniflare fail to build the dev environment and takes D1 and R2
  down with it.
- **The practice shuffle is the only place a stored value decides what you see
  next.** It lives in `usePracticeOrder` and is read only by the stack view.
- **`useCardStore` is the only thing that knows where cards live.** Local
  storage signed out, the account signed in. Nothing else in the app branches on
  it.
- **Signing in never deletes local storage.** The merge is additive and skips
  words already filed, which is what makes signing out safe.
- **The dictionary is generated and vendored.** `public/dict` is written by
  `node scripts/build-dictionary.ts` and committed, so a fresh clone works with
  no build step and no network. It is CC BY-SA, not MIT: see
  `public/dict/LICENCE.txt`.
- **Card meanings are English only.** There is no licensable Chinese to
  Vietnamese dictionary of usable quality; the two candidates and their measured
  coverage are written up in `docs/licences.md`. Vietnamese readers get the
  interface in Vietnamese and the Han-Viet reading, not a Vietnamese gloss.
- **Icons are never drawn by hand.** They come from the installed Iconify sets,
  and `public/favicon.svg` is generated from one by
  `node scripts/build-favicon.ts`.
