# Juka 橘卡

[![CI](https://github.com/anywaylupin/juka/actions/workflows/ci.yml/badge.svg)](https://github.com/anywaylupin/juka/actions/workflows/ci.yml)

Flashcard storage for HSK learners. A box of cards, not a tutor.

Juka stores the cards you write, finds them fast, and reads them aloud in Mandarin. It does not decide what to show you
or when. There is no spaced repetition, no review queue, no cards due today. That constraint is the point: it makes the
app something you can add to in seconds rather than something that nags you.

Writing a card is one field. **Type pinyin and it becomes hanzi**, so `shijian` offers 时间, and the reading, the
meaning, the part of speech, the character count and the search index all fill themselves in.

> Status: usable. Cards can be written, found, rated and heard, signed in or signed out, in English or Vietnamese.
> Stroke animation and the Han-Viet card face are still to come. See [where this is](#where-this-is).

## Cards that read in Vietnamese, not just an interface that does

Switch the language and 教师 stops saying _teacher_ and starts saying _giáo viên_. Most flashcard apps translate their
buttons and leave the words in English, which is the half that matters least.

Doing it needed a detour. There is no Chinese to Vietnamese dictionary that can be licensed and is any good: Vietnamese
Wiktionary's Chinese section covers 8.4% of common words and glosses 癌 "cancer" as squirrel monkey, and the
Chinese-Vietnamese dictionaries on GitHub carry no licence at all. But Vietnamese Wiktionary's **English** section is a
different work, 101,470 English head words defined in Vietnamese for Vietnamese readers, and every card already has an
English gloss from CC-CEDICT. So the gloss is the pivot: 教师 glosses _teacher_, _teacher_ is defined as _giáo viên_,
the card gets _giáo viên_.

That reaches **41% of the bundled dictionary and 64.3% of common words**, which is the half that matters, because a
learner's box is made of common words. Both meanings are written into the card when it is saved, so switching language
costs no request and no wait, and where the pivot found nothing the English stands.

Being a translation of a translation, it can drift, and the guards that keep it honest are written up in
[docs/licences.md](docs/licences.md) with the mistakes that prompted each one.

### Han-Viet, still to come

Every Chinese character also has a Sino-Vietnamese reading. 就 is _tựu_, 学 is _học_, 时间 is _thời gian_. A Vietnamese
speaker already knows thousands of these from their own vocabulary without realising they map onto Chinese characters,
which turns a wall of unfamiliar glyphs into words they half know already.

The readings are built and stored, from Unihan's `kVietnamese` field bridged to simplified characters through
`kTraditionalVariant`, but **nothing displays them yet**. Coverage is 52% of the dictionary and the missing half is not
the rare words: Unicode marks the field provisional and has no entry for characters as common as 时, 就 or 很,
so 学习 gives học tập and 时间 gives nothing. A field that is absent from half the cards reads as broken rather than as
a feature, so it waits for a second source.

The interface is English and Vietnamese. Card audio is always Mandarin, never tied to the interface language, because a
Vietnamese interface reading Chinese text in a Vietnamese voice would be useless.

## Screenshots

Pending. The card list on white, the same list under Tarocco on black, the card face mid-flip, and the add-card modal
filling in a part of speech by itself are the four worth showing. This section gets stills of those plus a short
recording of a card turning over, once the stroke animation lands with it.

## Live demo

Not deployed yet. The build targets Cloudflare Workers and the deploy path is wired and tested locally, so this becomes
a link as soon as there is something worth looking at.

## Architecture

A single Nuxt 4 app on Cloudflare Workers. No monorepo, no separate API, no container.

```
app/       components, composables, pages, layouts
server/    api routes, binding wrappers, database schema and migrations
shared/    types and zod schemas used by both sides
scripts/   one off node scripts, including the FTS5 spike
docs/      spike findings and licence records
```

### Why D1

The data is a few tables of short text rows with one dominant access pattern: list a user's cards, filtered and
paginated. That is SQLite's home ground. D1 puts SQLite next to the worker, so a card list is a local query rather than
a round trip to a database in another region, and the free tier covers a personal vocabulary collection many times over.

The cost is that D1 is not ordinary SQLite. It runs an authorizer that blocks functions you would expect to have,
`sqlite_version()` among them, and its full text search behaviour needed testing before the schema could be designed.
That testing is written up in [docs/fts5-spike.md](docs/fts5-spike.md).

Pagination is keyset, never `OFFSET`, so the cost of reading page 900 is the same as page one.

### Why R2

Audio is immutable blobs addressed by content hash, which is exactly what object storage is for and exactly what a
relational database is bad at. Keying by hash rather than by card means 时间 is stored once no matter how many users add
it, and R2 has no egress fee, which matters for a file that gets fetched every time a card is opened.

Audio is built in three tiers: the Web Speech API first because it needs no infrastructure, a Piper batch over the
finite HSK vocabulary second, and an on-demand synthesis fallback last for words outside the list.

### Why typing pinyin gives you the right character first

The hanzi field is an input method. Type `shijian` and it offers 时间, 事件, 实践, 始建. Press space or a number and the
field holds the character, not the romanisation.

Getting that order right is the whole problem. CC-CEDICT has the readings and the meanings but **no frequency data at
all**, and ranked on it alone `shijian` offers 世间, 事件, 始建, 实践 and 尸检 before it offers 时间, which makes the
feature worse than not having it. jieba's `dict.txt` has a frequency and a part of speech tag for 349,000 words but no
readings and no definitions. Joined on the simplified form they give a list ranked the way a learner expects, and the
part of speech comes from a real tag rather than a guess at the wording of an English gloss.

The result is sharded by first pinyin syllable, so typing `shi` fetches one file of a few dozen kilobytes rather than a
six megabyte dictionary, and the syllable table is derived from the source data rather than hand written.

**There is no model in this app.** Workers AI was wired in twice and removed twice: once for the HSK band and near
synonyms, once for translating a gloss into Vietnamese, each time because the dictionary turned out to answer the
question better. Every value on a card is now either something you typed or something looked up in a file that ships
with the app, which means it is the same answer every time, it costs nothing, and it works with the network off.

### Where the Vietnamese meanings come from

Four sources go into `public/dict`, and the fourth took the longest to find. CC-CEDICT gives the readings and the
English meanings, jieba gives the frequency that ranks them, Unihan gives the Han-Viet reading, and Vietnamese
Wiktionary's English section gives the Vietnamese meaning by way of the English gloss. The detour and the guards that
keep it honest are above; the measured coverage of every candidate is in [docs/licences.md](docs/licences.md), so nobody
repeats the search.

### Storing cards without an account

Juka works signed out. That is the default, not a degraded mode: cards go into `localStorage`, and everything, filters,
ratings, both views, behaves the same.

An account is offered as somewhere to keep them beyond one browser. Signing in does a **one-time additive merge**: local
cards are copied up, a word already on the account is skipped rather than overwritten, and the local copy is never
deleted. That last part is what makes signing out safe, because it drops back to exactly the cards that were there
before.

Getting in takes whichever way suits: a username, an email address, GitHub, or Google. A provider button only appears
when that provider has keys configured, so a fork with none shows a plain form rather than buttons that fail. An account
made through a provider has no password until someone sets one, and everything on an account, the username included,
stays changeable afterwards. Forgetting the password sends a single use link that expires in an hour; that is the only
email this app ever sends.

There is deliberately no continuous sync. Conflict resolution, delete tombstones and a replay log earn their place when
two devices write at once, which is not what a single-owner card box does.

### Why the search design is unusual

Chinese does not put spaces between words, so the default full text search tokeniser indexes a whole sentence as one
token and finds nothing. The obvious fix is FTS5's trigram tokeniser. Measured against D1, it turned out to be the wrong
choice: trigram cannot match a query shorter than three characters, and most HSK vocabulary is one or two characters.
Worse, a two character `LIKE` against a trigram table is slower than the same scan on a plain table, because it pays
index overhead for an index it cannot use.

Juka indexes the characters individually instead, separated by spaces, and searches them as a phrase. That handles one
character, two characters, longer words, and substrings that start mid-word, all at index speed.
[The numbers are here](docs/fts5-spike.md).

## Running it

Requires Node 22 or newer and pnpm.

```bash
pnpm install
```

Create the D1 database and the R2 bucket, then put the database id into `wrangler.jsonc`:

```bash
pnpm wrangler d1 create juka
pnpm wrangler r2 bucket create juka-audio
```

Apply the migrations to the local database and start the dev server:

```bash
pnpm db:migrate:local
pnpm dev
```

`pnpm dev` gets real Cloudflare bindings through Nitro's Cloudflare dev emulation, backed by the same local D1 state
that `wrangler d1` writes to, so what you see in development is what the worker sees.

To check the wiring end to end, including under the real workerd runtime:

```bash
pnpm build
pnpm wrangler dev
curl 'http://127.0.0.1:8787/api/health?probe=all'
```

`/api/health` reports whether the D1 binding resolved, whether the migrations ran, and whether R2 answers. It is read
only and safe to poll, so refreshing the status page costs nothing. There are only two bindings to check: the app has no
model in it.

### Other commands

| Command                              | What it does                                         |
| ------------------------------------ | ---------------------------------------------------- |
| `pnpm db:generate`                   | Generate a migration from the drizzle schema         |
| `pnpm dict:build`                    | Rebuild `public/dict` from its four upstream sources |
| `pnpm db:migrate:local`              | Apply migrations to the local database               |
| `node scripts/generate-theme-css.ts` | Rewrite the generated theme stylesheet               |
| `node scripts/build-favicon.ts`      | Rewrite the favicon from the icon set                |
| `pnpm db:migrate:local`              | Apply migrations to the local database               |
| `pnpm db:migrate:remote`             | Apply migrations to the real D1                      |
| `pnpm test`                          | Run the vitest suite                                 |
| `pnpm lint`                          | Run eslint                                           |
| `pnpm typecheck`                     | Run vue-tsc over the project                         |
| `pnpm deploy`                        | Build and deploy to Cloudflare Workers               |
| `node scripts/fts5-spike.ts --scale` | Re-run the search spike                              |

## Troubleshooting

**`/api/health` returns 503 and every other route fails too.** No environment variable is missing. This is the D1
binding not resolving at dev server start: Nitro asks wrangler for a bindings proxy once at boot, and if that call fails
it logs `Failed to initialize wrangler bindings proxy` and quietly falls back to a stub with no bindings, so every
request keeps failing until the server is restarted. The usual cause is a second process holding the local D1 state, for
example a `wrangler dev` left running in another terminal. Stop the strays and start `pnpm dev` again:

```bash
pkill -f "wrangler dev"
```

`/api/health` reports the cause in its `detail` field, so check that before anything else.

**Every route returns 500 and the app renders as an empty card box.** The local database has not been migrated. A fresh
clone starts with an empty D1, and a list that fails to load used to look exactly like a list with nothing in it. Run
`pnpm db:migrate:local`. The card list now says so itself rather than showing the empty state, and `/api/health` names
the cause.

**The only environment variable dev needs is `NUXT_SESSION_PASSWORD`**, and nuxt-auth-utils writes one into `.env` for
you on first run. Leaving `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` empty is fine, they are only read by
`--remote` commands and deploys.

## Stack

Nuxt 4 and Vue 3, Nuxt UI v4 with Tailwind CSS v4, `motion-v` for the springs. Cloudflare D1 through drizzle and
Cloudflare R2 for audio, deployed to Workers with the Nitro `cloudflare_module` preset. There is no third binding: the
dictionary ships with the app. `zod` validates every server route. `pinyin-pro` derives the readings and `@nuxtjs/i18n`
carries the two interface languages. `hanzi-writer` is installed for the stroke animation, which has not been wired up
yet.

## Design notes

Themes are named after citrus, but the colour is the **vibe the name carries**, not the literal colour of the fruit.
Clementine is the blue of the character's hair. Bergamot is Earl Grey, so it is tea-flower violet. Tarocco is blood.
Seville, the default, is clay on warm paper.

That is a correction, not a flourish. The first version used the real colour of each fruit and ended up with twelve
themes spread across sixty degrees of hue: Ponkan, Kumquat, Honeybell and Meyer were four oranges, and naming them after
different cultivars did not make them look different.

A theme sets the accent and nothing else. Surfaces, borders and text come from Nuxt UI's own defaults, the page is plain
white in light themes and plain black in dark ones, and the two reading modes name their own paper colour.

### The box, not a dashboard

The interface is built around a real box of index cards rather than around a list view.

**Card box** is how you browse. Cards stand on edge in a row with only the spine showing: the word written vertically, a
coloured stripe for the part of speech, and the rating at the foot. The card you are on rises out of the box and opens.
A grid was built first and thrown away, because a grid of flashcards is a table with rounded corners, and because
standing them up fits far more of them on a screen while keeping every hanzi readable.

**Stack** is how you go through them. The top card follows your finger: drag right to keep it and move on, left to bin
it with an undo, up or down to turn it over. A tap turns it over too. Two cards are drawn behind for depth.

A card shows **only the hanzi on the front**, because that is the entire point of a flashcard. The back carries the
reading, the meaning and the part of speech. There is no flip button; you click the card.

Everything that is not a card lives in the top bar, as an icon with a tooltip: the view, the filters, the one add
button, the theme, the language and the account. Filters are grouped rather than strung along a rail, and each option
carries a count, so a filter that would empty the box says so before you press it.

Part of speech has its own fixed colour, on the card, on the spine and in the filter. The rating is five mandarins in
one fixed colour that no theme changes: a five step ramp would be five things to learn where the count is already the
whole message.

## Where this is

- [x] Nuxt 4 scaffold, Cloudflare Workers deploy, D1 and R2 bindings, one validated route proving the database
      connection
- [x] FTS5 trigram spike, search design settled
- [x] Schema and drizzle migrations, including the search index and its triggers
- [x] Card list with keyset pagination and search
- [x] Card detail, create, edit
- [x] Web Speech audio
- [x] Themes and i18n
- [x] Bundled dictionary, so the hanzi field accepts pinyin and fills the card
- [x] Han-Viet readings from Unihan, covering 52% of the dictionary, stored but not yet shown
- [x] Rating as five mandarins, replacing the four named statuses
- [x] Gallery and stack views, grouped filters. Drag gestures were built and removed: a swipe is a poor home for the
      only destructive action
- [x] Accounts, with local storage when signed out and a merge on sign-in
- [x] Groups, named ratings you can rename, gallery, stack and chart views
- [x] Vietnamese card meanings, pivoted through the English gloss
- [x] Workers AI, built and removed twice. There is no model in the app
- [x] Units, built and then removed. Cards are one flat box found by search
- [ ] Notion importer (cards are being entered by hand for now)
- [ ] Stroke animation on the card face
- [ ] Stories
- [ ] Han-Viet on the card face, once a second source closes the gap
- [ ] Piper batch generation and the R2 fallback

Four things are deliberately unfinished, and it is worth being plain about them:

- **Sync is one-way and one-time.** Signing in copies local cards up; it does not keep two devices in step afterwards.
  Editing on a phone and a laptop in the same session will not merge, and there is no plan for it until there is a
  reason.
- **The list is not truly windowed.** It pages with a keyset cursor and infinite scroll, and each row uses
  `content-visibility` so off-screen rows cost almost nothing to render. That holds up for tens of thousands of rows.
  Real windowing is worth adding when the collection justifies it, not before.
- **Han-Viet covers half the dictionary**, so nothing shows it yet. Unihan answers 52%, and the gap includes very common
  characters. The column is filled where it can be, and a second licensed source would close it.
- **The Vietnamese meaning is a translation of a translation.** It pivots through the English gloss, reaches 64.3% of
  common words, and falls back to the English elsewhere. It is a dictionary lookup at both hops, never a guess, but two
  hops can still drift from the Chinese.
- **The part of speech is inferred, not authoritative.** It comes from jieba's tag for the whole word, mapped onto a
  closed list of fourteen. That is a real tag rather than a guess, but jieba tags for segmentation rather than for
  grammar teaching, so a word that works as both a verb and a noun gets whichever jieba leaned toward. It is editable
  for that reason.

## Attribution

Character stroke data comes from [Hanzi Writer](https://github.com/chanind/hanzi-writer) and
[Make Me a Hanzi](https://github.com/skishore/makemeahanzi), which derive from Arphic PL KaitiM GB and UKai.

> Arphic PL KaitiM GB and UKai, copyright 1999 Arphic Technology Co., Ltd. Make Me a Hanzi, copyright 2016 Shaunak
> Kishore. Licensed under the Arphic Public License.

The bundled dictionary in `public/dict` is built from [CC-CEDICT](https://cc-cedict.org/), published by MDBG and
licensed **CC BY-SA 4.0**, joined with word frequencies from [jieba](https://github.com/fxsjy/jieba) (MIT, copyright Sun
Junyi), Sino-Vietnamese readings from the [Unihan database](https://www.unicode.org/charts/unihan.html) (copyright
Unicode, Inc., under the Unicode License Agreement for Data Files and Software), and Vietnamese meanings from the
English section of [Vietnamese Wiktionary](https://vi.wiktionary.org) through [kaikki.org](https://kaikki.org), also
**CC BY-SA 4.0**.

> CC-CEDICT is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License. Referenced work:
> CEDICT, copyright 1997, 1998 Paul Andrew Denisowski.

Because CC-CEDICT is ShareAlike, **the files under `public/dict` are CC BY-SA 4.0 rather than MIT**. The application
code is unaffected. The full notice travels in `public/dict/LICENCE.txt`.

Icons come from [IconPark](https://github.com/bytedance/IconPark) and [Lucide](https://lucide.dev) through Iconify. None
are hand drawn.

Full licence records, including what is still outstanding, are in [docs/licences.md](docs/licences.md).

## Licence

MIT for the application code.

Two bundled datasets are not MIT and travel under their own terms: the character stroke data is under the Arphic Public
License, and the dictionary in `public/dict` is under CC BY-SA 4.0. Both are described above.
