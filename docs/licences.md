# Licences

Third party data and assets used by Juka, and what each one requires of us. Verified against the installed packages on
2026-09-16.

## Settled

### hanzi-writer 3.7.3, the code

MIT. Nothing required beyond keeping the notice.

### hanzi-writer-data 2.0.1, the stroke data

**Arphic Public License**, not MIT. The package declares `SEE LICENSE IN ARPHICPL.TXT` and ships both `ARPHICPL.TXT` and
an `APL` directory inside `node_modules/hanzi-writer-data`.

The data traces back through two works:

- Arphic PL KaitiM GB and UKai, copyright 1999 Arphic Technology Co., Ltd.
- Make Me a Hanzi, copyright 2016 Shaunak Kishore, itself derived from the above.

The Arphic Public License expects an attribution notice to travel with the work, so **the README carries this notice and
it must not be dropped**. The data is vendored through the npm package and bundled, never loaded from a CDN, which is
also what the brief requires for reasons of offline behaviour.

### pinyin-pro 3.29.4

MIT.

### segmentit 2.0.3

MIT. The `package.json` has no `license` field, but the package ships an MIT `LICENSE` file, copyright 2017 lin onetwo.
Worth re-checking if the dependency is ever upgraded.

### CC-CEDICT, the bundled dictionary

**CC BY-SA 4.0.** This is the one licence in the project that is not permissive, and it needs care.

CC-CEDICT supplies the readings and English definitions in `public/dict`, which is what lets the hanzi field accept
pinyin. It is published by MDBG and derives from CEDICT, copyright 1997, 1998 Paul Andrew Denisowski.

ShareAlike means an adaptation must carry the same licence. `public/dict` is an adaptation: joined with jieba, filtered,
re-ranked and reshaped by `scripts/build-dictionary.ts`. So:

- **The files in `public/dict` are CC BY-SA 4.0, not MIT.** The rest of the app stays MIT; the data directory does not.
- `public/dict/LICENCE.txt` carries the notice and is written by the build script. It must not be dropped, and the
  README attribution section names both sources.
- This does not affect the application code. The data is aggregated alongside it, not compiled into it.

### jieba dict.txt, word frequencies and part of speech tags

**MIT**, copyright Sun Junyi. https://github.com/fxsjy/jieba

Supplies the frequency and the part of speech tag for each word in `public/dict`, and the frequency is also what ranks
the derived synonym lists. Without it the candidate list is useless: CC-CEDICT has no frequency data, so typing
`shijian` offers 世间, 事件, 始建, 实践 and 尸检 before it offers 时间.

Only `jieba/dict.txt` is used, and only at build time. The library itself is not a dependency.

### Unihan, the Sino-Vietnamese readings

**Unicode License Agreement for Data Files and Software**, copyright Unicode, Inc. https://www.unicode.org/license.txt

Supplies the Han-Viet reading on a card, from the `kVietnamese` field of the Unicode Character Database. The field is
recorded against traditional characters, so `kTraditionalVariant` is used as a bridge to the simplified forms this app
stores; without that step 学习 resolves to nothing, and with it, to học tập.

The licence is permissive and requires the copyright and permission notice to travel with the data. The notice is in
`public/dict/LICENCE.txt`, which the build script writes.

**Coverage is partial and Unicode says so:** `kVietnamese` is a provisional field. It reaches 52% of the bundled
dictionary and has no entry at all for characters as common as 时, 就, 很, 咖 and 啡, which is why 时间 has no reading
even though the README uses thời gian as its example. Words are given a reading only when every character resolves, so a
card either has a correct one or none.

### Vietnamese Wiktionary, the English section, through kaikki.org

**CC BY-SA 4.0**, the same licence as the rest of `public/dict`, so it changes nothing about how the directory is
distributed. Reached through kaikki.org's machine readable extraction of `vi.wiktionary.org`.

Supplies the Vietnamese meaning on a card, and it gets there sideways. Vietnamese Wiktionary's _Chinese_ section was
measured first and rejected (see below). Its _English_ section is a different work: 101,470 English head words defined
in Vietnamese, written for Vietnamese readers learning English. CC-CEDICT already gives every card an English gloss, so
the gloss is the pivot: 教师 glosses as teacher, teacher is defined as giáo viên, and the card gets giáo viên.

**Coverage is 41% of the bundled dictionary and 64.3% of common words**, which is the number that matters, because a
learner's box is made of common words. Where the pivot finds nothing the English gloss stands.

Three guards keep the pivot honest, and each was added against real output:

- Only the **head word** of a gloss is looked up: parentheticals dropped, first clause of a `;` or `,` list, a leading
  "to", "a", "an" or "the" removed.
- Head words shorter than three letters are skipped, because 阿拉 is glossed "(Wu dialect) I" and the English letter I
  has a Vietnamese entry of its own.
- Wiktionary's pointer entries are dropped by pattern (Dạng, Thể, Số nhiều, Xem, Viết tắt, Chữ), since "plural of
  teacher" is not a meaning.

Being a translation of a translation, it can drift from the Chinese. That is the trade for having any Vietnamese at all,
and it is why the English is kept on the card record rather than replaced.

### icon-park-outline, lucide and circle-flags

**MIT** (IconPark is Apache 2.0 upstream; the Iconify packages ship it as MIT per their own `license` field, so confirm
before the first public release). Lucide is ISC. circle-flags is MIT.

Every icon in the interface comes from these sets. Nothing is hand drawn. `public/favicon.svg` is the `orange` icon from
`icon-park-outline`, recolored by `scripts/build-favicon.ts`, and the recoloring is the only change.

### nuxt-auth-utils and @adonisjs/hash

**MIT.** Password hashing is scrypt through `@adonisjs/hash`, reached via `hashPassword` and `verifyPassword`. Nothing
about the hash is stored in a second column: the salt and parameters travel inside the string.

## Still to record

These are blockers for the build steps that need them, not for the scaffold.

### HSK word list

Not yet chosen. Needed for the Piper batch generation, which runs over the whole HSK 3.0 vocabulary, and it would also
let the HSK band be looked up instead of asked of a model. Record the source and its licence here before importing any
list.

### Han-Viet, the remaining half

Unihan covers 52% of the dictionary and is recorded above. The gap is real and still needs a second source: the missing
characters include some of the most common in the language.

Two sources were measured and rejected before Unihan was chosen:

- **Vietnamese Wiktionary's Chinese section**, through kaikki.org (CC BY-SA, so the licence would have been fine). It
  carries Vietnamese _translations_ rather than readings, covers 8.4% of common words, and contains outright
  errors: 癌 "cancer" is glossed as squirrel monkey and 案 "legal case" as table. Not shipped. Note that its _English_
  section is shipped and is a different work entirely: see the entry above.
- **Chinese-Vietnamese dictionaries on GitHub.** Several exist. None of the ones found carry any licence at all, so none
  can be used.

Do not scrape. Record whatever fills the gap here before importing it.

### LXGW WenKai and Nunito

Both are now fetched and self hosted by `@nuxt/fonts`, which ships as a dependency of Nuxt UI and picks the families up
from the `@theme` block in `app/assets/css/main.css`. Nothing is committed to the repository, but files are served from
the deployed worker, so the licences need recording before release.

- LXGW WenKai is published under the **SIL Open Font License 1.1**, which is permissive but requires the copyright and
  licence notice to travel with the font files. The CSS asks for `LXGW WenKai TC` first because that is the name the
  font providers index.
- Nunito is also **SIL Open Font License 1.1**.

Confirm both against whichever provider `@nuxt/fonts` actually resolved, record the exact version, and add the notices
to the README attribution section before the first public deploy.

### Piper voice, zh_CN-huayan-medium

Not yet used. Record the model licence before the batch generation step ships audio built with it.
