import { normalizePartOfSpeech } from '#shared/constants/pos';
import type { DictionaryEntry } from '#shared/types/card';

/**
 * The bundled Mandarin dictionary, read from public/dict.
 *
 * This is what lets the hanzi field accept pinyin: type `shijian` and it offers 时间, and the entry carries the reading, the meaning and the part of speech so the rest of the card fills itself in.
 *
 * Sharded by first pinyin syllable, so typing `shi` fetches one file of a few dozen kilobytes rather than a six megabyte dictionary.
 * Shards are cached for the life of the page, and an in-flight fetch is shared rather than repeated.
 *
 * Built by scripts/build-dictionary.ts.
 * See public/dict/LICENCE.txt: the data is CC BY-SA, not MIT like the rest of the app.
 */

interface Manifest {
  syllables: string[];
  shards: Record<string, number>;
}

/**
 * Packed on disk as arrays to halve the bytes: [hanzi, pinyin, key, gloss, pos, hanViet, synonyms, vi, senses?]
 * The ninth field is there only when a word has more than one meaning.
 */
type PackedEntry = [string, string, string, string, string, string, string, string, Array<[string, string]>?];

/** Module scope, so every field on the page shares one cache. */
const shardCache = new Map<string, DictionaryEntry[]>();
const inFlight = new Map<string, Promise<DictionaryEntry[]>>();
let manifest: Manifest | null = null;
let manifestRequest: Promise<Manifest | null> | null = null;

function unpack([hanzi, pinyin, key, gloss, pos, hanViet, synonyms, vi, senses]: PackedEntry): DictionaryEntry {
  return {
    hanzi,
    pinyin,
    key,
    gloss,
    pos: normalizePartOfSpeech(pos),
    hanViet: hanViet || null,
    vi: vi || null,
    // Space separated on disk, because a JSON array of six short strings costs more in brackets and quotes than it does in content.
    synonyms: synonyms ? synonyms.split(' ').filter(Boolean) : [],
    senses: senses?.map(([sense, pivot]) => ({ gloss: sense, vi: pivot || null })) ?? [{ gloss, vi: vi || null }]
  };
}

async function loadManifest(): Promise<Manifest | null> {
  if (manifest) {
    return manifest;
  }

  manifestRequest ??= $fetch<Manifest>('/dict/manifest.json')
    .then((value) => {
      manifest = value;
      return value;
    })
    .catch(() => null);

  return manifestRequest;
}

let characterIndex: Promise<Record<string, string[]>> | null = null;

/** First character to the shards its words live in, fetched once, the first time a hanzi is looked up. */
function loadCharacterIndex(): Promise<Record<string, string[]>> {
  characterIndex ??= $fetch<Record<string, string[]>>('/dict/chars.json').catch(() => {
    characterIndex = null;
    return {};
  });
  return characterIndex;
}

async function loadShard(shard: string): Promise<DictionaryEntry[]> {
  const cached = shardCache.get(shard);
  if (cached) {
    return cached;
  }

  const pending = inFlight.get(shard);
  if (pending) {
    return pending;
  }

  const request = $fetch<PackedEntry[]>(`/dict/${shard}.json`)
    .then((packed) => {
      const entries = packed.map(unpack);
      shardCache.set(shard, entries);
      return entries;
    })
    // A missing shard is a syllable nobody writes words with, not an error.
    .catch(() => [] as DictionaryEntry[])
    .finally(() => inFlight.delete(shard));

  inFlight.set(shard, request);
  return request;
}

export function useDictionary() {
  /** True once the manifest is in, which is all that is needed to look up. */
  const ready = useState('juka:dict-ready', () => false);

  if (import.meta.client && !ready.value) {
    loadManifest().then((value) => {
      ready.value = value !== null;
    });
  }

  /**
   * Splits the leading syllable off a toneless pinyin string, greedily and longest first, using the same table the build script sharded with.
   * Both sides therefore agree on where a syllable ends, so `shuang` is never looked for in the `shu` shard.
   */
  function firstSyllable(key: string): string | null {
    // Null for a half typed syllable like `sh`, or for English: guessing a shard name there fetched files that do not exist, one 404 per keystroke.
    return manifest?.syllables.find((syllable) => key.startsWith(syllable)) ?? null;
  }

  /**
   * Candidates for whatever the user has typed.
   *
   * Latin input is treated as pinyin and matched as a prefix, so `shij` already narrows to 时间.
   * Hanzi input is matched directly, which is what makes the field useful to someone pasting from elsewhere or using a system IME: the meaning and part of speech still arrive.
   */
  async function lookup(raw: string, limit = 8): Promise<DictionaryEntry[]> {
    const input = raw.trim().toLowerCase().replaceAll(/\s+/g, '');
    if (!input) {
      return [];
    }

    await loadManifest();

    const hasHan = /\p{Script=Han}/u.test(raw);

    if (hasHan) {
      return lookupByHanzi(raw.trim(), limit);
    }

    if (!/^[a-zü]+$/.test(input)) {
      return [];
    }

    const key = input.replaceAll('ü', 'v');
    const shard = firstSyllable(key);
    if (!shard) {
      return [];
    }
    const entries = await loadShard(shard);

    // Shards arrive sorted by frequency, so the first matches are already the ones a learner is most likely to have meant.
    const exact: DictionaryEntry[] = [];
    const prefixed: DictionaryEntry[] = [];

    for (const entry of entries) {
      if (entry.key === key) {
        exact.push(entry);
      } else if (entry.key.startsWith(key)) {
        prefixed.push(entry);
      }
      if (exact.length >= limit) {
        break;
      }
    }

    return [...exact, ...prefixed].slice(0, limit);
  }

  /**
   * Looks a word up by its characters.
   * The shard a word lives in is keyed by its reading, which pasted hanzi do not carry, so `chars.json` maps the first character to its shards.
   * Scanning only the shards already in memory, as this used to, meant a pasted word or a freshly opened card found nothing until its pinyin had been typed once.
   */
  async function lookupByHanzi(hanzi: string, limit = 8): Promise<DictionaryEntry[]> {
    const found: DictionaryEntry[] = [];
    const shards = (await loadCharacterIndex())[[...hanzi][0] ?? ''] ?? [];

    for (const entries of await Promise.all(shards.map(loadShard))) {
      for (const entry of entries) {
        if (entry.hanzi === hanzi) {
          found.push(entry);
          if (found.length >= limit) {
            return found;
          }
        }
      }
    }

    return found;
  }

  /** The single best entry for an exact word, or null. Used to fill a card. */
  async function define(hanzi: string): Promise<DictionaryEntry | null> {
    const [best] = await lookupByHanzi(hanzi, 1);
    return best ?? null;
  }

  return { ready, lookup, define };
}
