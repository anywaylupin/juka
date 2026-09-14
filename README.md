# Juka 橘卡

Flashcard storage for HSK learners. A box of cards, not a tutor.

Juka stores the cards you write, files them into units, finds them fast, and
reads them aloud in Mandarin. It does not decide what to show you or when. There
is no spaced repetition, no review queue, no cards due today. That constraint is
the point: it makes the app something you can add to in seconds rather than
something that nags you.

> Status: usable. Cards can be written, filed, found, and heard. Auth, stroke
> animation, and the Han-Viet data are still to come. See
> [where this is](#where-this-is).

## Han-Viet, the part you will not find elsewhere

Every Chinese character has a Sino-Vietnamese reading. 就 is *tựu*, 学 is *học*,
时间 is *thời gian*. A Vietnamese speaker already knows thousands of these from
their own vocabulary without realising they map onto Chinese characters, which
turns a wall of unfamiliar glyphs into words they half know already.

Juka puts the Han-Viet reading on the card face next to the pinyin. It shows by
default when the interface is in Vietnamese, and sits behind a toggle when it is
in English. As far as I know no other HSK flashcard app does this.

The interface is English and Vietnamese. Card audio is always Mandarin, never
tied to the interface language, because a Vietnamese interface reading Chinese
text in a Vietnamese voice would be useless.

## Screenshots

Pending. The card list, the card face mid-flip, and the ripeness ring on the
units page are the three worth showing. This section gets stills of those plus a
short recording of a card turning over, once the stroke animation lands with it.

## Live demo

Not deployed yet. The build targets Cloudflare Workers and the deploy path is
wired and tested locally, so this becomes a link as soon as there is something
worth looking at.

## Architecture

A single Nuxt 4 app on Cloudflare Workers. No monorepo, no separate API, no
container.

```
app/       components, composables, pages, layouts
server/    api routes, binding wrappers, database schema and migrations
shared/    types and zod schemas used by both sides
scripts/   one off node scripts, including the FTS5 spike
docs/      spike findings and licence records
```

### Why D1

The data is a few tables of short text rows with one dominant access pattern:
list a user's cards, filtered and paginated. That is SQLite's home ground. D1
puts SQLite next to the worker, so a card list is a local query rather than a
round trip to a database in another region, and the free tier covers a personal
vocabulary collection many times over.

The cost is that D1 is not ordinary SQLite. It runs an authorizer that blocks
functions you would expect to have, `sqlite_version()` among them, and its
full text search behaviour needed testing before the schema could be designed.
That testing is written up in [docs/fts5-spike.md](docs/fts5-spike.md).

Pagination is keyset, never `OFFSET`, so the cost of reading page 900 is the
same as page one.

### Why R2

Audio is immutable blobs addressed by content hash, which is exactly what object
storage is for and exactly what a relational database is bad at. Keying by hash
rather than by card means 时间 is stored once no matter how many users add it,
and R2 has no egress fee, which matters for a file that gets fetched every time
a card is opened.

Audio is built in three tiers: the Web Speech API first because it needs no
infrastructure, a Piper batch over the finite HSK vocabulary second, and an
on-demand synthesis fallback last for words outside the list.

### Why the search design is unusual

Chinese does not put spaces between words, so the default full text search
tokeniser indexes a whole sentence as one token and finds nothing. The obvious
fix is FTS5's trigram tokeniser. Measured against D1, it turned out to be the
wrong choice: trigram cannot match a query shorter than three characters, and
most HSK vocabulary is one or two characters. Worse, a two character `LIKE`
against a trigram table is slower than the same scan on a plain table, because
it pays index overhead for an index it cannot use.

Juka indexes the characters individually instead, separated by spaces, and
searches them as a phrase. That handles one character, two characters, longer
words, and substrings that start mid-word, all at index speed.
[The numbers are here](docs/fts5-spike.md).

## Running it

Requires Node 22 or newer and pnpm.

```bash
pnpm install
```

Create the D1 database and the R2 bucket, then put the database id into
`wrangler.jsonc`:

```bash
pnpm wrangler d1 create juka
pnpm wrangler r2 bucket create juka-audio
```

Apply the migrations to the local database and start the dev server:

```bash
pnpm db:migrate:local
pnpm dev
```

`pnpm dev` gets real Cloudflare bindings through Nitro's Cloudflare dev
emulation, backed by the same local D1 state that `wrangler d1` writes to, so
what you see in development is what the worker sees.

To check the wiring end to end, including under the real workerd runtime:

```bash
pnpm build
pnpm wrangler dev
curl 'http://127.0.0.1:8787/api/health?probe=all'
```

`/api/health` reports whether the D1 binding resolved, whether the migrations
ran, and whether R2 answers. It is read only and safe to poll.

### Other commands

| Command | What it does |
|---|---|
| `pnpm db:generate` | Generate a migration from the drizzle schema |
| `pnpm db:migrate:local` | Apply migrations to the local database |
| `pnpm db:migrate:remote` | Apply migrations to the real D1 |
| `pnpm test` | Run the vitest suite |
| `pnpm lint` | Run eslint |
| `pnpm typecheck` | Run vue-tsc over the project |
| `pnpm deploy` | Build and deploy to Cloudflare Workers |
| `node scripts/fts5-spike.ts --scale` | Re-run the search spike |

## Troubleshooting

**`/api/health` returns 503 and every other route fails too.** No environment
variable is missing. This is the D1 binding not resolving at dev server start:
Nitro asks wrangler for a bindings proxy once at boot, and if that call fails it
logs `Failed to initialize wrangler bindings proxy` and quietly falls back to a
stub with no bindings, so every request keeps failing until the server is
restarted. The usual cause is a second process holding the local D1 state, for
example a `wrangler dev` left running in another terminal. Stop the strays and
start `pnpm dev` again:

```bash
pkill -f "wrangler dev"
```

`/api/health` reports the cause in its `detail` field, so check that before
anything else.

**The only environment variable dev needs is `NUXT_SESSION_PASSWORD`**, and
nuxt-auth-utils writes one into `.env` for you on first run. Leaving
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` empty is fine, they are only
read by `--remote` commands and deploys.

## Stack

Nuxt 4 and Vue 3, Nuxt UI v4 with Tailwind CSS v4, `motion-v` for the springs.
Cloudflare D1 through drizzle, Cloudflare R2 for audio, deployed to Workers with
the Nitro `cloudflare_module` preset. `zod` validates every server route.
`pinyin-pro` derives the readings and `@nuxtjs/i18n` carries the two interface
languages. `hanzi-writer` is installed for the stroke animation, which has not
been wired up yet.

## Design notes

Themes are named after citrus cultivars and each theme's primary colour is the
actual colour of that fruit, so the name carries the colour. Ponkan, a deep
mandarin orange, is the default. Tarocco, a blood orange, is the default dark
theme. Neutral is a warm taupe rather than a stock grey, which reads cold
against every colour in this palette.

Card status colours are deliberately outside the theme system and never change:
a ripening scale from unripe green through gold, with a separate leaf green for
mastered. A status is information, not decoration, so it must never be confused
with a button.

## Where this is

- [x] Nuxt 4 scaffold, Cloudflare Workers deploy, D1 and R2 bindings, one
      validated route proving the database connection
- [x] FTS5 trigram spike, search design settled
- [x] Schema and drizzle migrations, including the search index and its triggers
- [x] Card list with keyset pagination and search
- [x] Card detail, create, edit, status
- [x] Web Speech audio
- [x] Themes and i18n
- [ ] Notion importer (cards are being entered by hand for now)
- [ ] Stroke animation on the card face
- [ ] Stories
- [ ] Han-Viet column populated
- [ ] Piper batch generation and the R2 fallback

Three things are deliberately unfinished, and it is worth being plain about them:

- **There is no auth yet.** The build order puts it after the card UI. Until it
  lands the app runs as a single owner seeded by migration 0001, and every query
  already filters by that user id, so switching it on is a change to
  `requireUserId` in `server/utils/session.ts` and nothing else. Do not put this
  on a public URL before then.
- **The list is not truly windowed.** It pages with a keyset cursor and infinite
  scroll, and each row uses `content-visibility` so off-screen rows cost almost
  nothing to render. That holds up for tens of thousands of rows. Real windowing
  is worth adding when the collection justifies it, not before.
- **Han-Viet has a column, a form field, and a display toggle, but no data.**
  The readings show as soon as a permissively licensed mapping is seeded.

## Attribution

Character stroke data comes from
[Hanzi Writer](https://github.com/chanind/hanzi-writer) and
[Make Me a Hanzi](https://github.com/skishore/makemeahanzi), which derive from
Arphic PL KaitiM GB and UKai.

> Arphic PL KaitiM GB and UKai, copyright 1999 Arphic Technology Co., Ltd.
> Make Me a Hanzi, copyright 2016 Shaunak Kishore.
> Licensed under the Arphic Public License.

Full licence records, including what is still outstanding, are in
[docs/licences.md](docs/licences.md).

## Licence

MIT for the application code. The bundled character data is under the Arphic
Public License as described above.
