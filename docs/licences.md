# Licences

Third party data and assets used by Juka, and what each one requires of us.
Verified against the installed packages on 2026-09-13.

## Settled

### hanzi-writer 3.7.3, the code

MIT. Nothing required beyond keeping the notice.

### hanzi-writer-data 2.0.1, the stroke data

**Arphic Public License**, not MIT. The package declares
`SEE LICENSE IN ARPHICPL.TXT` and ships both `ARPHICPL.TXT` and an `APL`
directory inside `node_modules/hanzi-writer-data`.

The data traces back through two works:

- Arphic PL KaitiM GB and UKai, copyright 1999 Arphic Technology Co., Ltd.
- Make Me a Hanzi, copyright 2016 Shaunak Kishore, itself derived from the above.

The Arphic Public License expects an attribution notice to travel with the work,
so **the README carries this notice and it must not be dropped**. The data is
vendored through the npm package and bundled, never loaded from a CDN, which is
also what the brief requires for reasons of offline behaviour.

### pinyin-pro 3.29.4

MIT.

### segmentit 2.0.3

MIT. The `package.json` has no `license` field, but the package ships an MIT
`LICENSE` file, copyright 2017 lin onetwo. Worth re-checking if the dependency
is ever upgraded.

## Still to record

These are blockers for the build steps that need them, not for the scaffold.

### HSK word list

Not yet chosen. Needed for step 12, the Piper batch generation, which runs over
the whole HSK 3.0 vocabulary. Record the source and its licence here before
importing any list.

### Han-Viet character mapping

Not yet chosen. Needed for step 11. The brief is explicit: find a permissively
licensed mapping and record the licence. Do not scrape.

### LXGW WenKai

Not yet installed. The font is named in the CSS font stack but no font files are
bundled, so today the browser falls back to a system CJK serif. Record the
licence here when the files are added, before shipping them.

### Piper voice, zh_CN-huayan-medium

Not yet used. Record the model licence before the batch generation step ships
audio built with it.
