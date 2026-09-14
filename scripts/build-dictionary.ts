/**
 * Builds the bundled Mandarin dictionary that makes the hanzi field accept
 * pinyin.
 *
 * Type `shijian` and the field offers 时间 first, and the same entry carries
 * the reading, the meaning, and the part of speech, so the rest of the card
 * fills itself in. All of it is local, so candidates appear on the keystroke
 * rather than after a round trip, and it works with the network off.
 *
 * Three sources, because none is enough alone:
 *
 * - **CC-CEDICT** has the readings and the English meanings, but no frequency
 *   data at all. Ranked without it, `shijian` offers 世间, 事件, 始建, 实践 and
 *   尸检 before it offers 时间, which makes the feature worse than useless.
 * - **jieba's dict.txt** has a frequency and a part of speech tag for 349,000
 *   words, but no readings and no definitions.
 * - **Unihan** has the Sino-Vietnamese reading of a character, which is the
 *   whole Han-Viet feature. It is keyed on traditional forms, so a simplified
 *   headword has to be mapped through kTraditionalVariant first: without that
 *   step 学习 resolves to nothing, and with it, to học tập.
 * - **Vietnamese Wiktionary's English section** is an English to Vietnamese
 *   dictionary with 101,000 headwords, which is what finally gives a card a
 *   Vietnamese meaning. There is no usable Chinese to Vietnamese source, so the
 *   English gloss is the pivot: 教师 glosses "teacher", and teacher is giáo
 *   viên. See buildVietnamese for what that costs.
 *
 * Joined on the simplified form, they give a candidate list ranked the way a
 * learner expects, a part of speech that does not have to be guessed from the
 * wording of an English gloss, and a Han-Viet reading where one exists.
 *
 * Synonyms come out of the same join rather than out of a model: two words that
 * carry the same English gloss mean close to the same thing. See buildSynonyms.
 *
 * Output is sharded by first pinyin syllable, so typing `shi` fetches one file
 * of a few dozen kilobytes rather than the whole dictionary. The syllable table
 * is derived from the source data and written into the manifest, so the client
 * splits syllables exactly the way this script did.
 *
 * Licences differ per source and all three must travel with the output. See
 * public/dict/LICENCE.txt and docs/licences.md.
 *
 * Run:
 *   node scripts/build-dictionary.ts
 *   node scripts/build-dictionary.ts --cedict cedict.txt --jieba dict.txt --unihan Unihan.zip
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import AdmZip from 'adm-zip'
import { createGunzip } from 'node:zlib'
import { buffer } from 'node:stream/consumers'
import { Readable } from 'node:stream'
import { join } from 'node:path'

const CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz'
const JIEBA_URL = 'https://raw.githubusercontent.com/fxsjy/jieba/master/jieba/dict.txt'
const UNIHAN_URL = 'https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip'
const ENVI_URL = 'https://kaikki.org/viwiktionary/Ti%E1%BA%BFng%20Anh/kaikki.org-dictionary-Ti%E1%BA%BFngAnh.jsonl'
const OUT_DIR = 'public/dict'

/** Beyond four characters an entry is a sentence, not a flashcard. */
const MAX_HANZI = 4

/**
 * Entries jieba has never seen are kept only when they are single characters,
 * where the dictionary is acting as a character reference rather than an input
 * method. Everything else without a frequency is long-tail vocabulary that
 * would only ever push a common word further down the candidate list.
 */
const KEEP_UNRANKED_SINGLE_CHARACTERS = true

/** One sense is what fits on a card. The rest is dictionary browsing. */
const MAX_GLOSS = 72

/** More than this on a card face is a thesaurus, not a hint. */
const MAX_SYNONYMS = 6

/**
 * Above this many words sharing one gloss, the gloss is a grammatical note
 * rather than a meaning and the group is dropped.
 *
 * Without a ceiling every particle becomes a synonym of every other particle,
 * because they all gloss as "(particle)". Set too low, though, it throws away
 * exactly the groups worth having: earlier values of 12 and 40 both dropped
 * "happy" (52 words) and "beautiful" (57), which is the opposite of the intent.
 *
 * The real offenders were never the popular meanings, they were CC-CEDICT's
 * cross references: "variant of" alone groups 2,432 words. Those are now cut by
 * pattern in CROSS_REFERENCE, which lets this ceiling sit high enough to keep
 * any genuine meaning, with the frequency sort deciding which six to offer.
 */
const MAX_SHARED_GLOSS = 120

/**
 * Senses that point at another entry rather than carrying a meaning.
 *
 * Entries whose first sense looks like this are dropped wholesale further down.
 * This is the per-sense version, for entries that are kept but carry a cross
 * reference among their other senses.
 */
const CROSS_REFERENCE = /^(variant of|old variant of|erhua variant of|see|used in|abbr[.]? for|also pr[.]?|taiwan pr[.]?|same as|equivalent to)(?:\s|$)/i

const CEDICT_LINE = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/
const HAN_ONLY = /^[\u4e00-\u9fff\u3400-\u4dbf]+$/

/**
 * jieba's tag set mapped onto the closed list in shared/constants/pos.ts.
 *
 * Only the tags that map cleanly are listed. A tag that is not here leaves the
 * part of speech null, because a wrong label on a card is worse than a blank
 * one and the user can set it in one tap.
 */
const JIEBA_POS: Record<string, string> = {
  n: 'noun', ng: 'noun', nt: 'noun', s: 'noun', t: 'noun', f: 'noun', an: 'noun', vn: 'noun',
  nr: 'name', ns: 'name', nz: 'name', nrt: 'name', nrfg: 'name',
  v: 'verb', vd: 'verb', vg: 'verb', vi: 'verb', vq: 'verb', vf: 'verb', vx: 'verb',
  a: 'adjective', ad: 'adjective', ag: 'adjective', al: 'adjective',
  d: 'adverb', dg: 'adverb', df: 'adverb',
  r: 'pronoun', rr: 'pronoun', rz: 'pronoun', rg: 'pronoun', ry: 'pronoun',
  m: 'numeral', mq: 'numeral', mg: 'numeral',
  q: 'measure',
  p: 'preposition', pba: 'preposition', pbei: 'preposition',
  c: 'conjunction', cc: 'conjunction',
  u: 'particle', ud: 'particle', ug: 'particle', uj: 'particle', ul: 'particle',
  uv: 'particle', uz: 'particle', y: 'particle', k: 'particle', h: 'particle',
  e: 'interjection', o: 'interjection',
  i: 'idiom',
  l: 'phrase'
}

interface Entry {
  hanzi: string
  pinyin: string
  /** Words that share a gloss with this one. Filled after every entry is read. */
  synonyms: string[]
  /** Toneless, no spaces, `u:` folded to `v`. What the user actually types. */
  key: string
  gloss: string
  pos: string
  /** The meaning in Vietnamese, pivoted through the English gloss, or empty. */
  vi: string
  /**
   * The Sino-Vietnamese reading, or empty.
   *
   * Only written when **every** character in the word resolves. A partial
   * reading like "? gian" for 时间 is worse than none: it looks like data, and
   * a Vietnamese reader cannot tell which half to trust.
   */
  hanViet: string
  frequency: number
}

/** `shi2 jian1` becomes `shí jiān`, which is what goes on the card. */
const TONE_MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ']
}

function toneSyllable(raw: string): string {
  const tone = Number(raw.match(/[0-5]$/)?.[0] ?? 5)
  const base = raw.replace(/[0-5]$/, '').toLowerCase().replace(/u:/g, 'v')

  if (tone < 1 || tone > 4) {
    return base.replace(/v/g, 'ü')
  }

  // Standard placement: a and e always win, ou takes the o, otherwise the last vowel.
  const index = base.includes('a')
    ? base.indexOf('a')
    : base.includes('e')
      ? base.indexOf('e')
      : base.includes('ou')
        ? base.indexOf('o')
        : Math.max(base.lastIndexOf('i'), base.lastIndexOf('o'), base.lastIndexOf('u'), base.lastIndexOf('v'))

  if (index === -1) {
    return base.replace(/v/g, 'ü')
  }

  const vowel = base[index] as string
  const marked = TONE_MARKS[vowel]?.[tone - 1] ?? vowel

  return (base.slice(0, index) + marked + base.slice(index + 1)).replace(/v/g, 'ü')
}

const toneless = (raw: string) => raw.replace(/[0-9]/g, '').toLowerCase().replace(/u:/g, 'v')

/**
 * Character to Sino-Vietnamese reading, from Unihan's kVietnamese field.
 *
 * kVietnamese is recorded against traditional characters, and this app stores
 * simplified ones, so kTraditionalVariant is used as a bridge. That single step
 * takes coverage of the common vocabulary from 25% to 63%.
 *
 * Unicode marks kVietnamese provisional, and it shows: very frequent characters
 * including 时, 就, 很, 咖 and 啡 simply have no entry. Words containing one are
 * left without a reading rather than given half of one.
 */
async function readUnihan(): Promise<Map<string, string>> {
  const local = flag('unihan')
  const bytes = local
    ? await readFile(local)
    : Buffer.from(await (await fetchOrThrow(UNIHAN_URL)).arrayBuffer())

  const zip = new AdmZip(bytes)
  const readings = new Map<string, string>()
  const traditional = new Map<string, string>()

  const codePoint = (token: string) => String.fromCodePoint(Number.parseInt(token.replace(/^U\+/, '').split('<')[0] as string, 16))

  for (const [file, handle] of [
    ['Unihan_Readings.txt', (ch: string, field: string, value: string) => {
      if (field === 'kVietnamese') {
        // Several readings are listed for some characters; the first is the
        // common one, and a card face has room for one.
        readings.set(ch, value.split(/\s+/)[0] as string)
      }
    }],
    ['Unihan_Variants.txt', (ch: string, field: string, value: string) => {
      if (field === 'kTraditionalVariant') {
        traditional.set(ch, codePoint(value.split(/\s+/)[0] as string))
      }
    }]
  ] as const) {
    const entry = zip.getEntry(file)
    if (!entry) {
      throw new Error(`Unihan archive is missing ${file}`)
    }

    for (const line of entry.getData().toString('utf8').split('\n')) {
      if (!line || line.startsWith('#')) {
        continue
      }
      const [cp, field, value] = line.replace(/\r$/, '').split('\t')
      if (!cp || !field || !value) {
        continue
      }
      handle(codePoint(cp), field, value)
    }
  }

  // Fold the traditional readings down onto the simplified forms, so a lookup
  // is one map access rather than two with a fallback.
  for (const [simplified, trad] of traditional) {
    if (!readings.has(simplified)) {
      const reading = readings.get(trad)
      if (reading) {
        readings.set(simplified, reading)
      }
    }
  }

  return readings
}

async function fetchOrThrow(url: string): Promise<Response> {
  console.log(`Downloading ${url}`)
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status}): ${url}`)
  }
  return response
}

async function fetchText(url: string, gunzip: boolean): Promise<string> {
  console.log(`Downloading ${url}`)
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status}): ${url}`)
  }

  if (!gunzip) {
    return response.text()
  }

  const stream = Readable.fromWeb(response.body).pipe(createGunzip())
  return (await buffer(stream)).toString('utf8')
}

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function readSource(name: string, url: string, gunzip: boolean): Promise<string> {
  const local = flag(name)
  return local ? readFile(local, 'utf8') : fetchText(url, gunzip)
}

/** word -> [frequency, mapped part of speech] */
function parseJieba(source: string): Map<string, [number, string]> {
  const ranked = new Map<string, [number, string]>()

  for (const line of source.split('\n')) {
    const [word, count, tag] = line.trim().split(/\s+/)
    if (!word || !count || !HAN_ONLY.test(word)) {
      continue
    }

    const frequency = Number(count)
    if (!Number.isFinite(frequency)) {
      continue
    }

    // jieba lists a handful of words twice. The higher count is the real one.
    const existing = ranked.get(word)
    if (existing && existing[0] >= frequency) {
      continue
    }

    ranked.set(word, [frequency, JIEBA_POS[tag ?? ''] ?? ''])
  }

  return ranked
}

/**
 * Fills in each entry's synonyms, from words that share an English gloss.
 *
 * The idea is the whole trick: CC-CEDICT glosses are terse and repetitive, so
 * 高兴, 快乐 and 开心 all carry "happy" somewhere in their sense list. Grouping
 * by normalised gloss and reading the groups back out gives a synonym list with
 * no model, no extra dataset, and no licence beyond the one already recorded.
 *
 * Three guards keep it honest:
 *
 * - A gloss shared by more than MAX_SHARED_GLOSS words is a function word or a
 *   bare grammatical note, and is dropped. Otherwise every particle becomes a
 *   synonym of every other particle.
 * - Glosses are normalised first, so "to study" and "study" meet, and the
 *   parenthetical asides CC-CEDICT is full of are stripped.
 * - Candidates are sorted by frequency, so the synonyms offered are words a
 *   learner might actually meet rather than the rarest match.
 */
function buildSynonyms(entries: Entry[], allSenses: Map<string, string[]>) {
  const byHanzi = new Map(entries.map(entry => [entry.hanzi, entry]))
  const groups = new Map<string, string[]>()

  const normalise = (gloss: string) => gloss
    .toLowerCase()
    // CC-CEDICT hangs register, domain and usage notes in brackets. They are
    // not part of the meaning and they stop otherwise identical glosses meeting.
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    // A leading "to " is an infinitive marker, not a distinction.
    .replace(/^\s*to\s+/, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  for (const [hanzi, senses] of allSenses) {
    if (!byHanzi.has(hanzi)) {
      continue
    }
    for (const sense of senses) {
      const key = normalise(sense)
      // A one word gloss is the useful case; an empty one carries nothing.
      if (!key || key.length < 2) {
        continue
      }
      const bucket = groups.get(key)
      if (bucket) {
        bucket.push(hanzi)
      }
      else {
        groups.set(key, [hanzi])
      }
    }
  }

  for (const [, members] of groups) {
    if (members.length < 2 || members.length > MAX_SHARED_GLOSS) {
      continue
    }

    for (const hanzi of members) {
      const entry = byHanzi.get(hanzi)
      if (!entry) {
        continue
      }
      for (const other of members) {
        if (other !== hanzi && !entry.synonyms.includes(other)) {
          entry.synonyms.push(other)
        }
      }
    }
  }

  // Rank by frequency and cut, so the list is the words worth meeting.
  for (const entry of entries) {
    if (entry.synonyms.length === 0) {
      continue
    }
    entry.synonyms.sort((a, b) => (byHanzi.get(b)?.frequency ?? 0) - (byHanzi.get(a)?.frequency ?? 0))
    entry.synonyms = entry.synonyms.slice(0, MAX_SYNONYMS)
  }
}

/**
 * Fills in each entry's Vietnamese meaning, pivoted through the English gloss.
 *
 * There is no licensable Chinese to Vietnamese dictionary of usable quality:
 * the ones measured are written up in docs/licences.md. But Vietnamese
 * Wiktionary has a large English section, which is an English to Vietnamese
 * dictionary, and every card already carries an English gloss. So 教师 glosses
 * "teacher", and teacher is giáo viên.
 *
 * **Pivoting costs accuracy and the cost is worth naming.** An English gloss
 * that is a homograph resolves to whichever Vietnamese sense the pivot picks,
 * so 爱好 "to like" once came back as giống, meaning "similar". Two guards cut
 * most of that:
 *
 * - The lookup is keyed by head word **and part of speech**. The card already
 *   knows it is a verb, so the verb sense of "like" wins over the preposition.
 * - Head words shorter than three letters are skipped. Otherwise 阿拉, glossed
 *   "(Wu dialect) I; me", matched the English letter I.
 *
 * What survives is a first sense, not a considered translation, and the card
 * keeps it as written so a later rebuild cannot silently reword an old card.
 */
async function buildVietnamese(entries: Entry[]) {
  const source = await readSource('envi', ENVI_URL, false)

  /** "teacher|noun" and "teacher" both, so an unmatched part of speech still resolves. */
  const byWordAndPos = new Map<string, string>()
  const byWord = new Map<string, string>()

  // Vietnamese Wiktionary's own part of speech names, mapped onto the closed
  // list the cards use.
  const POS: Record<string, string> = {
    noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb',
    pron: 'pronoun', num: 'numeral', prep: 'preposition', conj: 'conjunction',
    intj: 'interjection', phrase: 'phrase', name: 'name', particle: 'particle'
  }

  const POINTER = /^(D[ạa]ng|Th[ểe]|S[ốo] nhi[ềe]u|Xem|Vi[ếe]t t[ắa]t|Ch[ữu])/i

  for (const line of source.split('\n')) {
    if (!line) {
      continue
    }

    let record: { word?: string, pos?: string, senses?: Array<{ glosses?: string[] }> }
    try {
      record = JSON.parse(line)
    }
    catch {
      continue
    }

    const word = (record.word ?? '').trim().toLowerCase()
    if (!word || !/^[a-z][a-z' -]*$/.test(word)) {
      continue
    }

    const gloss = record.senses
      ?.flatMap(sense => sense.glosses ?? [])
      .map(entry => entry.trim().replace(/[.]$/, ''))
      .find(entry => entry && !POINTER.test(entry))

    if (!gloss) {
      continue
    }

    const pos = POS[record.pos ?? '']
    if (pos) {
      const key = `${word}|${pos}`
      if (!byWordAndPos.has(key)) {
        byWordAndPos.set(key, gloss)
      }
    }
    if (!byWord.has(word)) {
      byWord.set(word, gloss)
    }
  }

  console.log(`Vietnamese Wiktionary: ${byWord.size} English headwords`)

  for (const entry of entries) {
    const head = headWord(entry.gloss)

    // Two letters is not a word worth pivoting on; it is "I", "an" or "up".
    if (head.length < 3) {
      continue
    }

    entry.vi = byWordAndPos.get(`${head}|${entry.pos}`) ?? byWord.get(head) ?? ''
  }
}

/** The first meaningful English word of a gloss, which is what to look up. */
function headWord(gloss: string): string {
  return gloss
    .toLowerCase()
    // CC-CEDICT hangs register and domain notes in brackets; they are not the
    // meaning and they are never the thing to translate.
    .replace(/\([^)]*\)/g, ' ')
    .split(';')[0]!
    .split(',')[0]!
    .replace(/^\s*(to|a|an|the)\s+/, '')
    .trim()
}

async function main() {
  const [cedictSource, jiebaSource, hanViet] = await Promise.all([
    readSource('cedict', CEDICT_URL, true),
    readSource('jieba', JIEBA_URL, false),
    readUnihan()
  ])

  const ranked = parseJieba(jiebaSource)
  console.log(`jieba: ${ranked.size} ranked words`)
  console.log(`Unihan: ${hanViet.size} characters with a Sino-Vietnamese reading`)

  /** Every character or nothing. A half reading is not a reading. */
  const readHanViet = (word: string) => {
    const parts = [...word].map(character => hanViet.get(character))
    return parts.every(Boolean) ? parts.join(' ') : ''
  }

  const entries: Entry[] = []
  /** hanzi -> every English sense it has, for the synonym pass. */
  const allSenses = new Map<string, string[]>()
  /*
   * Derived from the source rather than hand written. Every syllable that
   * appears in CC-CEDICT is by definition a real syllable, and a hand kept list
   * silently loses entries the moment it misses one: an earlier version of this
   * script omitted sha, she and shu, which quietly misfiled a thousand words
   * into a junk shard.
   */
  const syllables = new Set<string>()
  let parsed = 0

  for (const line of cedictSource.split('\n')) {
    if (!line || line.startsWith('#')) {
      continue
    }

    const match = CEDICT_LINE.exec(line.trim())
    if (!match) {
      continue
    }
    parsed += 1

    const [, , simplified = '', pinyin = '', body = ''] = match

    if (!HAN_ONLY.test(simplified) || simplified.length > MAX_HANZI) {
      continue
    }

    // CC-CEDICT capitalises the pinyin of proper nouns, which is the only marker
    // it gives for them. A flashcard box does not want 17,000 place names.
    const rawSyllables = pinyin.split(/\s+/)
    if (rawSyllables.some(part => /^[A-Z]/.test(part))) {
      continue
    }

    const defs = body.split('/').map(part => part.trim()).filter(Boolean)
    const senses = defs.filter(part => !/^CL:/i.test(part))

    // A cross reference carries no meaning of its own on a card face.
    if (senses.length === 0 || /^(variant of|old variant|see |used in |abbr\. for)/i.test(senses[0] ?? '')) {
      continue
    }

    const rank = ranked.get(simplified)
    const frequency = rank?.[0] ?? 0

    if (frequency === 0 && !(KEEP_UNRANKED_SINGLE_CHARACTERS && simplified.length === 1)) {
      continue
    }

    for (const part of rawSyllables) {
      syllables.add(toneless(part))
    }

    let gloss = senses[0] as string
    if (gloss.length > MAX_GLOSS) {
      gloss = `${gloss.slice(0, MAX_GLOSS - 1).trimEnd()}…`
    }

    /*
     * Every sense, not just the one shown, and split on semicolons as well as
     * slashes. CC-CEDICT writes 快乐 as "happy; joyful" in a single sense, so
     * without the second split it never meets 高兴, whose sense is bare "happy".
     */
    allSenses.set(
      simplified,
      senses
        .flatMap(sense => sense.split(';').map(part => part.trim()))
        .filter(part => part && !CROSS_REFERENCE.test(part))
    )

    entries.push({
      hanzi: simplified,
      synonyms: [],
      pinyin: rawSyllables.map(toneSyllable).join(' '),
      key: rawSyllables.map(toneless).join(''),
      gloss,
      pos: rank?.[1] ?? '',
      vi: '',
      hanViet: readHanViet(simplified),
      frequency
    })
  }

  buildSynonyms(entries, allSenses)
  await buildVietnamese(entries)

  // Longest first, so `shuang` is never split as `shu` + `ang`.
  const ordered = [...syllables].sort((a, b) => b.length - a.length || a.localeCompare(b))

  const firstSyllable = (key: string) => ordered.find(syllable => key.startsWith(syllable)) ?? key.slice(0, 2)

  const shards = new Map<string, Entry[]>()
  for (const entry of entries) {
    const shard = firstSyllable(entry.key)
    const bucket = shards.get(shard)
    if (bucket) {
      bucket.push(entry)
    }
    else {
      shards.set(shard, [entry])
    }
  }

  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const manifest: Record<string, number> = {}

  for (const [shard, bucket] of shards) {
    // Frequency is the whole point of the jieba join: the candidate a learner
    // meant is the one they meet most often, not the one that sorts first.
    bucket.sort((a, b) =>
      b.frequency - a.frequency
      || a.hanzi.length - b.hanzi.length
      || a.hanzi.localeCompare(b.hanzi)
    )

    // Array of arrays rather than objects: the same data, roughly half the bytes.
    const packed = bucket.map(entry => [
      entry.hanzi,
      entry.pinyin,
      entry.key,
      entry.gloss,
      entry.pos,
      entry.hanViet,
      entry.synonyms.join(' '),
      entry.vi
    ])

    await writeFile(join(OUT_DIR, `${shard}.json`), JSON.stringify(packed), 'utf8')
    manifest[shard] = bucket.length
  }

  await writeFile(
    join(OUT_DIR, 'manifest.json'),
    JSON.stringify({
      sources: [
        'CC-CEDICT (CC BY-SA 4.0)',
        'jieba dict.txt (MIT)',
        'Unihan (Unicode licence)',
        'Vietnamese Wiktionary, English section (CC BY-SA 4.0)'
      ],
      synonyms: 'derived from shared CC-CEDICT glosses',
      builtAt: new Date().toISOString().slice(0, 10),
      entries: entries.length,
      // The client splits the leading syllable with this same list, so the two
      // sides can never disagree about which shard to fetch.
      syllables: ordered,
      shards: manifest
    }),
    'utf8'
  )

  await writeFile(join(OUT_DIR, 'LICENCE.txt'), LICENCE, 'utf8')

  const biggest = [...shards.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3)
  const withHanViet = entries.filter(entry => entry.hanViet).length
  const withSynonyms = entries.filter(entry => entry.synonyms.length > 0).length
  const withVietnamese = entries.filter(entry => entry.vi).length
  console.log(`Parsed ${parsed} CC-CEDICT lines, kept ${entries.length} entries across ${shards.size} shards`)
  console.log(`Han-Viet readings on ${withHanViet} entries (${Math.round((withHanViet / entries.length) * 100)}%)`)
  console.log(`Synonyms on ${withSynonyms} entries (${Math.round((withSynonyms / entries.length) * 100)}%)`)
  console.log(`Vietnamese meanings on ${withVietnamese} entries (${Math.round((withVietnamese / entries.length) * 100)}%)`)
  console.log(`Largest shards: ${biggest.map(([name, bucket]) => `${name} (${bucket.length})`).join(', ')}`)
}

const LICENCE = [
  'The JSON files in this directory are generated by scripts/build-dictionary.ts',
  'from three upstream sources. They are NOT covered by the MIT licence that',
  'covers the rest of Juka.',
  '',
  '1. CC-CEDICT, published by MDBG.',
  '   Readings and English definitions.',
  '   Creative Commons Attribution-ShareAlike 4.0 International.',
  '   https://creativecommons.org/licenses/by-sa/4.0/',
  '   Referenced work: CEDICT, copyright 1997, 1998 Paul Andrew Denisowski.',
  '',
  '2. jieba, copyright Sun Junyi.',
  '   Word frequencies and part of speech tags, from jieba/dict.txt.',
  '   MIT licence. https://github.com/fxsjy/jieba',
  '',
  '3. Unihan, copyright Unicode, Inc.',
  '   Sino-Vietnamese readings, from the kVietnamese field of the Unicode',
  '   Character Database, resolved through kTraditionalVariant.',
  '   Distributed under the Unicode License Agreement for Data Files and',
  '   Software. https://www.unicode.org/license.txt',
  '',
  'These files are an adaptation of all three works: joined, filtered, re-ranked',
  'and reshaped. CC-CEDICT is ShareAlike, so the combined result is distributed',
  'under CC BY-SA 4.0.',
  ''
].join('\n')

await main()
