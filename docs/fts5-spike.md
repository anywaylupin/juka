# FTS5 spike: what D1 actually supports

Run it yourself:

```bash
node scripts/fts5-spike.ts --scale --rows=100000
```

Date: 2026-09-13. wrangler 4.131.1, workerd 1.20260911.1, local D1. Local D1 runs the same SQLite build that workerd
ships, so these answers carry to production. The remote run is still outstanding, see
[what is not settled](#what-is-not-settled).

## Short answer

FTS5 is available and `tokenize='trigram'` works, but **trigram is the wrong choice for this app**. It cannot match a
query shorter than three characters, and most HSK vocabulary is one or two characters. The per-character index that the
brief listed as the fallback is the better primary.

## What was tested

19 probes, all of which ran without error. The interesting results:

| Question                             | Result                                   |
| ------------------------------------ | ---------------------------------------- |
| Is FTS5 compiled into D1?            | Yes                                      |
| Does `tokenize='trigram'` work?      | Yes, the table creates and indexes CJK   |
| `MATCH '图书馆'` (3 characters)      | Finds it                                 |
| `MATCH '时间'` (2 characters)        | **No match**                             |
| `MATCH '就'` (1 character)           | **No match**                             |
| `LIKE '%时间%'` on a trigram table   | Finds it, but see the timings            |
| `MATCH '好意思'` inside 不好意思     | Finds it, mid-word substrings work at 3+ |
| Per character `MATCH '"时 间"'`      | Finds it                                 |
| Per character `MATCH '就'`           | Finds it                                 |
| Per character `MATCH '"好 意 思"'`   | Finds it, mid-word works                 |
| Pinyin prefix `MATCH 'shi*'`         | Finds it                                 |
| `bm25()` for ranking                 | Available                                |
| External content tables (`content=`) | Accepted                                 |

The trigram tokenizer needs three characters to form a trigram. At one or two characters there is nothing to look up, so
`MATCH` returns nothing at all. This is not a D1 limitation, it is how the tokenizer works, and it happens to remove
exactly the case this app needs most.

## The timings that settle it

`EXPLAIN QUERY PLAN` is not usable evidence here. A `LIKE` against a trigram table reports
`SCAN ... VIRTUAL TABLE INDEX 0:L0` whether or not the index can actually serve the query, so the plan looks identical
at two and three characters. Timing separates them. 100,000 rows, best of three runs, duration as reported by D1:

| Query                                           | 20k rows | 100k rows |
| ----------------------------------------------- | -------- | --------- |
| Plain table `LIKE '%时间%'` (a known full scan) | 2 ms     | 9 ms      |
| Trigram `LIKE '%时间%'` (2 characters)          | 5 ms     | **21 ms** |
| Trigram `LIKE '%图书馆%'` (3 characters)        | 0 ms     | 0 ms      |
| Trigram `MATCH '图书馆'`                        | 0 ms     | 0 ms      |
| Per character `MATCH '"时 间"'`                 | 0 ms     | 0 ms      |
| Per character `MATCH '"图 书 馆"'`              | 1 ms     | 1 ms      |
| Per character `MATCH '就'` (2,329 hits)         | 1 ms     | 3 ms      |

Two readings matter:

1. Trigram `LIKE` at two characters grows linearly with the row count, which means it is scanning. It is **slower than
   the same scan on a plain table**, because it pays FTS5 overhead for an index it cannot use. Adding a trigram index
   would make the most common search slower than having no index at all.
2. Every per-character query stays flat as the corpus grows fivefold.

## The decision

**Primary index: per-character FTS5 with the default unicode61 tokenizer.**

Store a `hanzi_chars` column holding the characters of `hanzi` separated by spaces (时间 becomes `时 间`), derived on
write next to `syllables` and `pinyin_plain`. Search it as an FTS5 phrase:

```sql
-- user typed 时间
select rowid from cards_fts where cards_fts match '"时 间"';
```

This handles one character, two characters, longer words, and substrings that start mid-word, all at index speed. No
trigram table, so nothing has to be kept in sync with a tokenizer that cannot answer the common query.

Pinyin lives in the same FTS5 table as `pinyin_plain` and is searched with a prefix term (`jiu*`), which is what makes
typing `jiu` find 就. Column-filtered queries work, so one table serves both: `cards_fts match 'pinyin_plain : shi*'`.

### Consequences to carry into the schema

- `hanzi_chars` is derived on write, like `syllables` and `pinyin_plain`. All three are computed in one place so they
  cannot drift from `hanzi`.
- The FTS5 table is a separate virtual table keyed by the card rowid, not a column on `cards`. External content tables
  work, which keeps the text from being stored twice.
- Infix pinyin does not work with this design. Searching `jian` will not find `shijian`, because unicode61 indexes
  `shijian` as one token and FTS5 prefix terms only anchor at the start. Prefix search does work. If infix pinyin turns
  out to matter, that is the one case a second trigram index over `pinyin_plain` alone would earn its keep, since Latin
  pinyin is almost always three characters or more. Do not add it speculatively.
- Ranking with `bm25()` is available if search results ever need ordering beyond the keyset order.

## Other D1 findings

- `sqlite_version()` is **blocked**: `not authorized to use function: sqlite_version`. D1 runs an authorizer that
  rejects it. Anything reporting the database version has to use another signal. `/api/health` reports the applied
  migration count instead.
- `pragma compile_options` is **blocked**, so the FTS5 build flags cannot be read directly. Creating a virtual table is
  the way to test for a feature.
- `pragma table_list` is **allowed** and lists the user tables plus `d1_migrations`.
- FTS5 shadow tables (`*_data`, `*_idx`, `*_content`) do not appear in `sqlite_master` queries filtered by name, so
  tooling that enumerates tables will not trip over them.

## What is not settled

- **The remote run.** Everything above is local, which uses the workerd SQLite build. Repeat with
  `node scripts/fts5-spike.ts --scale --remote` once a real D1 instance exists, and correct this document if anything
  differs. The authorizer is the most likely place for a local and remote difference.
- **A million rows.** The largest corpus tested here is 100,000. The per-character index is flat across the range
  tested, but the keyset pagination and virtual scrolling work should be validated at the real target.
- **Segmentation.** Linking story text to cards needs word segmentation (`segmentit` or `jieba-wasm`). That is a
  separate question from card search and this spike says nothing about it.
