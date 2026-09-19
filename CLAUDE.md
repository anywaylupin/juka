# Juka

@AGENTS.md

Juka (橘卡, "mandarin card") is an open source flashcard **storage** app for HSK learners. It replaces a Notion database
that grew too large to maintain by hand.

The mental model is a physical box of flashcards, not a tutor. The user writes cards, files them, finds them, and hears
them. The app does not decide what to show or when.

Interface languages: English and Vietnamese. Card audio: always Mandarin (`zh-CN`), never tied to the interface locale.

## Non-goals

Do not build these, and reject scope creep toward them:

- No spaced repetition, no review scheduling, no due dates, no cards due today. **One deliberate exception**, added at
  the author's request: the stack view's practice order deals weakly known cards more often. It is a weighted shuffle,
  not a schedule. There is no due date, no interval, and no memory of when a card was last seen, it applies only in that
  view, and reloading gives a different order. If anything here ever grows a notion of _when_, it has crossed the line
  this bullet is drawing
- No quiz or test mode beyond revealing the answer on a card
- **No AI anywhere.** There is no model in this app and no AI binding. The reading, the meaning, the part of speech, the
  synonyms and the Vietnamese are all lookups in the bundled dictionary, which is a citation and not a guess. Workers AI
  was wired in twice and removed twice: for the HSK band and near synonyms in migration 0006, and for translating a
  gloss into Vietnamese in 0009, once the dictionary learned to answer that too. Do not wire it in a third time
- No social features, sharing, or public decks. Signing in with GitHub or Google is not one of these: it is a way in,
  not a feed
- **No email except a password reset.** No digests, no reminders, no "you have not studied in a week"

- No mobile native app, a PWA is enough

The storage-only premise is what makes this shippable. If a feature requires an algorithm deciding what the user sees
next, it is out of scope.

## Why it exists

1. Primary: replace the author's Notion flashcard database with something faster to add to.
2. Secondary: a portfolio piece. Code quality, README, and the live demo matter as much as features.

## Data model

```sql
users(id, username, password_hash NULL, email UNIQUE, theme, rating_labels, created_at)

cards(
  id, user_id,
  hanzi, pinyin, pinyin_plain, hanzi_chars, pinyin_search, han_viet,
  translation, translation_vi, pos,
  rating, syllables, notes,
  created_at, updated_at
)

groups(id, user_id, name, colour, order_index, created_at)
card_groups(card_id, group_id)

oauth_accounts(id, user_id, provider, provider_account_id, email, created_at)
password_resets(id, user_id, token_hash, expires_at, used_at, created_at)

stories(id, user_id, title_zh, title_en, hsk_level, body, is_example, created_at)
story_cards(story_id, card_id)
audio(hanzi_hash, r2_key, voice, created_at)
```

- **A new box starts with HSK 1 to 6**, in `shared/constants/groups.ts`, on an account and in local storage alike. They
  are an example, not a schema: rename them, delete them, or ignore them and make thirty of your own. Grouping is
  invisible without them, because the panel is a blank page with a plus on it and the first card has nowhere to go.
  Deleting all six is remembered, so they do not grow back.
- **Groups are the third attempt at dividing the box, and the first that works.** Units were one-per-card folders,
  removed in migration 0002 because a card had to be filed somewhere. Groups are many-to-many and optional: a card can
  be in none, and being in two is not a conflict. The user names them, colours them, and deleting one removes a label
  rather than a card.
- **One card per word per owner**, enforced by a unique index on `(user_id, hanzi)` as well as by a check in the route.
  A box with 时间 in it twice is a box you stop trusting, and the merge on sign-in leans on this to decide what to skip.
- `rating` is 0 to 5, drawn as a row of mandarins, where 0 means unrated. The five levels are **named**: new, difficult,
  hesitant, good, mastered. The names are the user's to change, stored in `users.rating_labels` as JSON, and default to
  the current locale's wording rather than to English. Vietnamese defaults to mới, khó, lưỡng lự, khá and thuộc, which
  are the words a Vietnamese learner uses rather than translations of the English ones.
- `syllables` is derived from character count on write, stored so it can be filtered without a scan.
- `pinyin_plain` is tone-stripped and lowercased, so typing `jiu` finds 就.
- `translation` is the English gloss and `translation_vi` the Vietnamese one. Both are written at the same moment from
  the same dictionary entry, so a card reads in whichever language the interface is in without asking anything at
  request time. Vietnamese falls back to the English when the dictionary has none, which is a worse card but never an
  empty one.
- `han_viet` is nullable and, for now, written but never shown. See below.
- **There is no `hsk_level` and no `insights` table.** Both were dropped in migration 0006 along with the Workers AI
  binding. The bundled dictionary answers the reading, the meaning and the part of speech, which left nothing for a
  model to say, and the app now has no model in it at all.
- `email` is optional, unique when present, and lowercased on write. It is a second way to sign in and the only address
  a reset link can go to, which is what made it unique in migration 0010.
- `password_hash` is **nullable**. An account made through GitHub or Google has none until someone sets one, and the
  routes ask for a current password only when there is one to ask for.
- **Every field on an account is changeable at any time**: username, address, password, and which providers are
  connected. Nothing is set once at sign-up and frozen.

### Search

Settled by the spike, written up in [docs/fts5-spike.md](docs/fts5-spike.md). Read it before touching search.

Short version: **do not use the trigram tokenizer.** It cannot match queries shorter than three characters, which is
most HSK vocabulary, and a two character `LIKE` against a trigram table is slower than a plain table scan. Use a
per-character FTS5 index instead: a `hanzi_chars` column holding the characters separated by spaces, searched as a
phrase (`match '"时 间"'`). Derive `hanzi_chars` on write alongside `syllables` and `pinyin_plain`.

Pagination is keyset (`WHERE id > ? LIMIT n`), never `OFFSET`. Pair it with virtual scrolling on the client.

D1 blocks `sqlite_version()` and `pragma compile_options`. Do not rely on them.

## Writing a card

One field. Type pinyin or hanzi into the big field in the middle of the card shaped modal, and the reading, the meaning,
the part of speech, the character count and the search index all fill themselves in.

**The meaning and the part of speech are not inputs.** They are looked up, so they are displayed on the card rather than
offered as boxes to fill in and get wrong. What is left for the user is the rating and the note.

### The bundled dictionary

`public/dict` is generated by `scripts/build-dictionary.ts` from four sources, because none is enough alone:

- **CC-CEDICT** has readings and English meanings, and no frequency data at all. Ranked without it, typing `shijian`
  offers 世间, 事件, 始建, 实践 and 尸检 before it offers 时间, which makes the feature worse than not having it.
- **jieba's `dict.txt`** has a frequency and a part of speech tag for 349,000 words, and no readings or definitions.
- **Unihan** has the Sino-Vietnamese reading, keyed on traditional characters, so `kTraditionalVariant` bridges it to
  the simplified forms this app stores.
- **Vietnamese Wiktionary's English section** has 101,470 English head words defined in Vietnamese, and nothing Chinese
  in it at all. It is reached through the English gloss, which is the one thing every card already has.

Joined on the simplified form they give a candidate list ranked the way a learner expects. Output is sharded by first
pinyin syllable, so typing `shi` fetches one file of a few dozen kilobytes rather than the whole dictionary, and the
syllable table is derived from the source rather than hand written.

**Synonyms come out of the same join, not out of a model.** Two words carrying the same English gloss mean close to the
same thing, so grouping by normalised gloss and reading the groups back gives a synonym list for 61% of the dictionary.
Two guards make it usable: cross references like "variant of" are cut by pattern (that one gloss alone groups 2,432
words), and a gloss shared by more than 120 words is a grammatical note rather than a meaning. Both numbers were tuned
against real output: caps of 12 and 40 each threw away "happy" and "beautiful" for being too popular, which is the
opposite of the intent.

**The licences differ from the app's.** CC-CEDICT is CC BY-SA 4.0, which is ShareAlike, so everything in `public/dict`
is CC BY-SA and not MIT. The notice in `public/dict/LICENCE.txt` must not be dropped.

### Vietnamese meanings

**Looked up, not translated.** 教师 is giáo viên on the card, and nothing asks a model at any point.

There is no Chinese to Vietnamese dictionary that can be licensed and is any good, which is written up in
`docs/licences.md` and was true when a model was doing this job instead. What there is, is a Vietnamese dictionary of
English: Vietnamese Wiktionary's English section, 101,470 head words. CC-CEDICT gives every card an English gloss, so
the gloss is the pivot. teacher is defined as giáo viên, and 教师 gets giáo viên.

It reaches **41% of the dictionary and 64.3% of common words**, which is the half that matters, because a learner's box
is made of common words. Three guards keep it honest, each added against real output, and they are documented with their
counterexamples in `docs/licences.md`.

Both languages are written into the card when it is saved, so switching the interface to Vietnamese changes what a card
says with no request and no wait. Where the pivot found nothing the English stands, which is worse than a Vietnamese
meaning and better than a blank.

## Accounts and storage

**The app works signed out.** That is the default state, not a degraded one.

- Signed out, the box is `localStorage`. Local card ids are negative, so they can never collide with an account's.
- Signed in, the box is the account, read through the keyset paginated route.
- `useCardStore` is the only thing that knows which. Everything else asks it, so there is one code path for a card list
  rather than two that drift.

Signing in offers a **one-time additive merge**: local cards are copied up, a word already on the account is skipped
rather than overwritten, and **the local copy is never deleted**. That last part is what makes signing out safe: it
drops back to exactly the cards that were there before.

There is no continuous sync, no conflict resolution and no tombstones, on purpose. That machinery earns its place when
two devices write at once, which is not what a single-owner card box does.

### Ways in

Username and password through `nuxt-auth-utils`, scrypt via `hashPassword`, **or** GitHub, **or** Google. Sign-in takes
a username or an email address in one field and works out which it is, because nobody remembers which they used.

`requireUserId` returns a 401 rather than falling back to an owner: a signed out visitor never calls a card route at
all.

- **A provider sign-in is one route per provider**, `/auth/github` and `/auth/google`, which redirect out and come back.
  No access token is stored: it is spent once in the callback to read the profile and dropped, because nothing in the
  app ever calls a provider on the user's behalf.
- **Matching is by provider account first, then by verified address.** Someone who signed up with an address and later
  presses the Google button for the same address gets their box, not a second empty one. GitHub and Google both verify
  before handing an address over, and Google's `email_verified` is checked rather than assumed.
- **A provider button appears only when that provider has keys.** `/api/auth/providers` says which, so a deployment with
  no OAuth configured shows a plain form rather than buttons that 500.
- **A new password is always typed twice**, at sign-up, at a change, and at a reset. It is the one field nobody can read
  back to check.
- **Disconnecting the last way in is refused**, with the reason said out loud. An account with no password and no
  provider is unreachable, and a settings toggle is not allowed to do that to someone.

### Forgetting a password

`/api/auth/forgot` answers 204 whatever happens: account or no account, address or no address, mail sent or not. Any
other answer turns the form into a way to ask whether a person has an account here.

The token is 32 random bytes, stored as a SHA-256 hash and never in the clear, single use, and good for an hour.
Spending one deletes every other link for that account, so an older email stops working at the same moment. Setting the
password signs them in, because they have just proved they hold the address.

**This is the one email the app sends.** It goes through Resend when `NUXT_RESEND_API_KEY` and `NUXT_MAIL_FROM` are set
and is written to the server log when they are not, which is what makes it usable in development and visible as a
missing key in production. The link is built from `NUXT_PUBLIC_SITE_URL`, not from the request: a Host header is
attacker controlled and this is the last link in the app to trust one.

## Audio

Three tiers, built in this order:

1. Web Speech API with a `zh-CN` voice. Zero infrastructure, covers most desktop and iOS users.
2. Pre-generated batch. Run Piper (`zh_CN-huayan-medium`) in a GitHub Action over the whole HSK vocabulary once, upload
   to R2, key by hash. A build step, not an upload feature.
3. On-demand fallback at `/api/audio/:hash` for words outside the list. Check R2 first, synthesize and cache on miss.

The audio language is hardcoded `zh-CN`. It is not a user setting and it is not derived from the i18n locale.

## Han-Viet

The differentiating feature. Every hanzi has a Sino-Vietnamese reading (就 is tựu, 学 is học, 时间 is thời gian). A
Vietnamese learner already knows thousands of these without realising they map to Chinese characters.

**Nothing shows it at the moment, at the author's request.** A card in Vietnamese should read like a dictionary entry:
the word, how to say it, what it means. The Sino-Vietnamese reading is a third thing on a card that has room for two,
and at 52% coverage it is present on about half of them, which reads as a field that keeps going missing rather than as
a feature.

The column is still written at the same moment as the meaning, so nothing has to be rebuilt when it comes back. When it
does, it belongs on the back of the card beside the pinyin and **only when the locale is `vi`**, with no toggle: one
existed in the header and was removed, because for an English reader it revealed a column with no data in it.

The mapping comes from **Unihan's `kVietnamese`** field, built into the dictionary so a card gets its reading at the
same moment it gets its meaning. The licence is recorded in `docs/licences.md`.

**It covers 52% of the dictionary, and the gap is not the rare words.** Unicode marks `kVietnamese` provisional, and it
has no entry for characters as common as 时, 就, 很, 咖 and 啡. So 学习 resolves to học tập and 时间 resolves to
nothing, even though thời gian is the example this very section opens with.

A word gets a reading only when **every** character resolves. A partial reading looks like data and a reader cannot tell
which half to trust. Where there is no reading the field is left blank and stays editable, which is the only field on
the card a Vietnamese reader may still have to write by hand.

Two other sources were measured and rejected, and the numbers are in `docs/licences.md` so nobody re-runs that search.
Do not scrape.

## Themes

Named after citrus, but the colour is the **vibe the name carries**, not the literal colour of the fruit.

The old rule, every primary is the real colour of that fruit, produced twelve themes spread across sixty degrees of hue.
Ponkan, Kumquat, Honeybell and Meyer were four oranges, and naming them after different cultivars did not make them look
different. So Clementine is the blue of the character's hair, Bergamot is Earl Grey rather than rind, and Tarocco is
blood.

| Theme      | Mode  | Primary   | Where the colour comes from                  |
| ---------- | ----- | --------- | -------------------------------------------- |
| Seville    | sepia | `#D97757` | **The default.** Claude's clay on warm paper |
| Ponkan     | light | `#E35205` | 椪柑. Deep mandarin orange                   |
| Tangerine  | light | `#F5821F` | Straight tangerine orange                    |
| Clementine | light | `#2F6FD0` | The blue of Clementine's hair, not the peel  |
| Meyer      | light | `#D99E00` | Meyer lemon, softened toward honey           |
| Yuzu       | light | `#8A9B1F` | Sharp yellow-green, high acid                |
| Calamansi  | light | `#2E9153` | Southeast Asian green, cut with lime         |
| Bergamot   | light | `#6B5BD2` | Earl Grey. The flower, not the rind          |
| Cara Cara  | light | `#E0596B` | Pink navel, coral flesh                      |
| Pomelo     | light | `#0E8F9E` | Cool and pale, the quiet one                 |
| Chenpi     | sepia | `#9C5A2B` | 陈皮, dried aged peel. Darker paper          |
| Marmalade  | dark  | `#E08236` | Amber preserve held up to the light          |
| Tarocco    | dark  | `#E0344E` | Blood orange. The default dark theme         |

Implementation:

- **A theme sets the accent and nothing else.** Surfaces, borders and text come from Nuxt UI's defaults. An earlier
  version generated fifteen semantic tokens per theme, which meant twelve hand tuned palettes to keep in balance.
- **The page is plain white in light modes and plain black in dark ones.** A reading mode is the exception and names its
  own paper colour, which is the only reason `ThemeDefinition.page` exists.
- Generated into `app/assets/css/themes.css`. Edit `shared/constants/themes.ts` and run
  `node scripts/generate-theme-css.ts`.
- Neutral is one warm taupe shared by every theme. Never stock grey.
- The cookie is the source of truth for rendering, because it is the only thing readable during SSR. A signed in account
  mirrors it so the choice follows you to another browser.

**The rating mandarin is one fixed colour, `#F5821F`, across every theme.** A five step colour ramp would be five things
to learn where the count is already the whole message, and borrowing the theme accent would make a rating look like a
button. The user has to be able to tell a button from a state.

## Look and feel

**Nuxt UI's defaults, used as they come.** Rings, focus states and surfaces are Nuxt UI's own. The one override is the
colour of the focus ring on a text field, which Nuxt UI paints in the accent and which reads as an orange glow on a warm
palette; it is swapped to neutral and the extra translucent outline is dropped. That is a colour correction, not a
bespoke effect, and it is the only entry in `app.config.ts` besides the palette.

Do not add a 3D press, a raised panel class, or a page gradient back. That was tried and removed: it read as heavy and
made problems hard to place, because a wrong border could have come from the theme, a slot override, or the component.

The metaphor is a real box of index cards, and the layout is built around that rather than around a dashboard:

- **The top bar does the work.** View, filters, add, theme, language and account all live on one line, so the page below
  is nothing but cards. Icons with tooltips, never labels.
- **Gallery** is the browse view: the whole box laid out, paged. A toggle in the top bar decides whether turning one
  card turns the last one back (for testing yourself) or cards turn independently (for reading back through them). An
  edge-on deck was tried in between and removed: it looked like a card box and was miserable to read, because a vertical
  word in a 44px spine tells you almost nothing.
- **Stack** is the one-at-a-time view, drawn as a deck: the two cards to come stand behind the top one and peek out
  above it as coloured edges, one for each part of speech, so you can see there is more without counting. Forward and
  back are arrows under the deck, with the position between them; a click or the space bar turns the top card over.
  Stepping deals the old card up and away and brings the next one out of the deck. Its order comes from
  `usePracticeOrder` unless practice mode is switched off.
- **There is no swipe, and adding one back needs a better argument than the first one had.** Dragging left to delete put
  the only destructive action in the app on the gesture most easily made by accident, on top of a card whose other
  gesture is a tap. It also cost a release to a silent binding bug. Every action on a card is a button now.
- **Chart** is the box from above: a ripeness bar across the five named levels, a calendar heatmap of cards added per
  day, and a split by word type and by group. Built from divs, not SVG and not a charting library, because everything on
  it is a proportion or a count.
- **A card shows only the hanzi on the front.** The back carries the reading, the meaning and the part of speech, and
  nothing else. There is no flip button: clicking the card turns it.
- **A card is shaped like a card**, 5 by 3.2, the proportions of the index card everyone already owns, rather than
  whatever height the content needed.
- **The chrome is pinned over the card, not inside it.** Copy top left, edit and delete top right, audio bottom right
  under the thumb, rating across the foot. All of it sits outside the rotating element and fades out for the 500ms a
  flip takes: buttons that spin with the card belong to neither face, and an earlier version that put a copy inside each
  face left eighteen focusable controls on a card with nine. Edit, delete and copy appear on hover or focus; the rating
  and the audio are always there.
- **The hanzi is not selectable.** Selecting the word by accident while reaching for the card is the common case; the
  copy button is the deliberate way to take the text.
- **Turning one card in the gallery turns only that card**, unless the top bar is set to one at a time, which is the
  mode for testing yourself. Nothing else may turn a card back: rating, editing or deleting any card used to turn every
  face-up card over, because the flip set was cleared whenever the card array was rebuilt.
- **Motion says what happened, and never gates what is shown.** Views slide along the row their icons sit in, cards in
  the gallery land one after another, the deck deals. Loading, failure and an empty box sit outside that transition:
  `mode="out-in"` holds new content back until the old content has finished leaving, and a tab that is not being painted
  never finishes anything.
- **Waiting has a shape.** A card-shaped skeleton in the grid the cards will fill, plus an indeterminate bar under the
  top bar. Never a spinner in the middle of an empty page, and never a progress bar that is not measuring anything.
- **Anything that acts when clicked has a pointer cursor.** Tailwind's reset gives buttons `cursor: default`, which
  leaves an interface where nothing looks pressable; `main.css` puts it back for buttons, summaries, and the menu,
  option and tab roles.
- **Part of speech has its own colour**, fixed across every theme, on the card, on the spine, and in the filter.
  `PART_OF_SPEECH_COLOURS` in `shared/constants/pos.ts`.
- **Filters are grouped**, not one long rail: how well you know it, word type, and length. Each group is multi-select
  with per-option counts, so a filter that would empty the box says so before it is pressed.
- **One add button in the app**, in the top bar.
- Icons come from the installed sets. Never hand write path data. The favicon is lifted from the same set by
  `scripts/build-favicon.ts`, and the language picker uses `circle-flags`.

## Build order

1. ~~Nuxt scaffold, Cloudflare Workers deploy, D1 and R2 bindings, one route proving the database connection works end
   to end.~~ Done.
2. ~~FTS5 trigram spike. Settle the search design.~~ Done, see `docs/fts5-spike.md`.
3. ~~Schema and drizzle migrations.~~ Done, including `cards_fts` and its triggers.
4. ~~Notion importer.~~ Skipped at the author's request.
5. ~~Card list with pagination and search.~~ Done, keyset.
6. ~~Card create and edit.~~ Done.
7. ~~Web Speech audio.~~ Done, tier one only.
8. ~~Units.~~ Built, then removed in migration 0002. Do not reintroduce them.
9. ~~Themes and i18n.~~ Done, thirteen themes.
10. ~~Workers AI for the HSK band.~~ Built, then removed in migration 0006. The app has no model in it. Do not
    reintroduce one.
11. ~~Bundled dictionary, so the hanzi field accepts pinyin and fills the card.~~ Done, see
    `scripts/build-dictionary.ts`.
12. ~~Rating as five mandarins, replacing the four named statuses.~~ Done.
13. ~~Card box and stack views, drag gestures, grouped filters.~~ Done.
14. ~~Accounts, and local storage for signed out use with a merge on sign-in.~~ Done, migration 0006.
15. ~~Groups, customisable rating names, gallery and chart views, synonyms, Vietnamese meanings.~~ Done, migration 0007.
16. hanzi-writer stroke animation on the card face. **Not started, and it needs a decision first:** `hanzi-writer-data`
    ships about 9,000 JSON files. Bundling them all through Vite is not viable, and the brief forbids a CDN, so the data
    has to be vendored into `public/` by a build step or narrowed to the characters actually in use.
17. Stories, with one seeded example. Do not copy text from any existing graded reader, it is copyrighted.
18. Han-Viet back on the card face. Deferred at the author's request, not blocked: the column is populated from Unihan
    already. Two things are missing, a second licensed source for the common characters Unihan omits, and a place on the
    card that does not crowd the meaning.
19. Piper batch generation and R2 fallback.

Keep Notion running in parallel until the app has been used daily for two weeks.

## Current state

- **Auth is real.** Username and password through `nuxt-auth-utils`, scrypt hashing, sessions in a signed cookie.
  `requireUserId` returns a 401 rather than falling back to an owner; the bootstrap owner row from migration 0001 was
  removed in 0006. Signed out visitors never reach a card route, because their cards are in local storage.
- **Theme colours are generated.** `app/assets/css/themes.css` is written by `node scripts/generate-theme-css.ts` from
  `shared/constants/themes.ts`. Edit the constants and regenerate, never the CSS.
- **Derived card fields have one home.** `deriveCardFields` in `server/utils/card-fields.ts` produces `pinyin`,
  `pinyin_plain`, `hanzi_chars`, `pinyin_search`, and `syllables`. Nothing else may write those columns.
- **Search input never reaches FTS5 as syntax.** `buildSearchMatch` extracts only Han runs and alphanumeric runs, so
  quotes and operators are dropped.
- **There is no model and no AI binding.** Removed for the second time in migration 0009, along with the `translations`
  cache, the route, the composable and the `ai` block in `nuxt.config.ts`. Everything a card knows about a word, in
  either language, comes from the bundled dictionary.
- **The practice shuffle is the only place a stored value decides what you see next.** It lives in `usePracticeOrder`
  and is read only by the stack view.
- **`useCardStore` is the only thing that knows where cards live.** Local storage signed out, the account signed in.
  Nothing else in the app branches on it.
- **Signing in never deletes local storage.** The merge is additive and skips words already filed, which is what makes
  signing out safe.
- **The dictionary is generated and vendored.** `public/dict` is written by `node scripts/build-dictionary.ts` and
  committed, so a fresh clone works with no build step and no network. It is CC BY-SA, not MIT: see
  `public/dict/LICENCE.txt`.
- **Cards carry both meanings.** English from CC-CEDICT, Vietnamese pivoted through the English gloss into Vietnamese
  Wiktionary's English section, both written at save time. The card face reads `translationVi` under the `vi` locale and
  falls back to the English.
- **Signing in is offered, never demanded.** `useSignInReminder` raises a toast on the first visit and at most once a
  week after it, carrying its own off switch. It never blocks the page, and never fires for someone signed in.
- **Icons are never drawn by hand.** They come from the installed Iconify sets, and `public/favicon.svg` is generated
  from one by `node scripts/build-favicon.ts`.
