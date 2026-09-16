/**
 * FTS5 spike.
 *
 * Chinese does not tokenize on whitespace, so the default FTS5 tokenizer is useless for this app.
 * This script settles, against a real D1, three questions that decide the search design before the schema hardens:
 *
 * 1. Does D1 build SQLite with FTS5 at all?
 * 2. Does tokenize='trigram' work, and does MATCH find short CJK words?
 * 3. Does the per-character fallback work for one and two character words?
 *
 * Local by default, which runs the same workerd SQLite build wrangler ships.
 * Pass --remote to repeat the run against the real D1 instance.
 *
 * Usage: node scripts/fts5-spike.ts [--remote] [--scale] [--rows=100000]
 */
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);

const REMOTE = process.argv.includes('--remote');
const SCALE = process.argv.includes('--scale');
const SCALE_ROWS = Number(process.argv.find((arg) => arg.startsWith('--rows='))?.slice(7) ?? 20_000);
const TARGET = REMOTE ? '--remote' : '--local';
const DATABASE = 'juka';
const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

interface Outcome {
  ok: boolean;
  rows: Record<string, unknown>[];
  /** Server side duration reported by D1, in milliseconds. */
  durationMs: number | null;
  error: string | null;
}

async function runSql(sql: string): Promise<Outcome> {
  return runWrangler(['--command', sql]);
}

async function runSqlFile(path: string): Promise<Outcome> {
  return runWrangler(['--file', path]);
}

async function runWrangler(args: string[]): Promise<Outcome> {
  try {
    const { stdout } = await exec('pnpm', ['exec', 'wrangler', 'd1', 'execute', DATABASE, TARGET, '--json', ...args], {
      maxBuffer: 1024 * 1024 * 64
    });
    const start = stdout.indexOf('[');
    const parsed = JSON.parse(stdout.slice(start === -1 ? 0 : start)) as Array<{
      results?: Record<string, unknown>[];
      meta?: { duration?: number };
    }>;
    const last = parsed.at(-1);
    return {
      ok: true,
      rows: parsed[0]?.results ?? [],
      durationMs: last?.meta?.duration ?? null,
      error: null
    };
  } catch (error) {
    return { ok: false, rows: [], durationMs: null, error: extractError(error) };
  }
}

function extractError(error: unknown): string {
  const text = [
    (error as { stderr?: string }).stderr,
    (error as { stdout?: string }).stdout,
    error instanceof Error ? error.message : String(error)
  ]
    .filter(Boolean)
    .join('\n')
    .replace(ANSI_PATTERN, '');

  const line = text
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.includes('ERROR'));

  return (line ?? text.split('\n')[0] ?? 'unknown error').replace(/^.*\[ERROR\]\s*/, '').trim();
}

interface Probe {
  name: string;
  question: string;
  sql: string;
  /** Reads the returned rows and decides what the answer means. */
  verdict?: (rows: Record<string, unknown>[]) => string;
}

// Four words covering the realistic length range of an HSK vocabulary list.
const SAMPLE = [
  { id: 1, hanzi: '就', pinyinPlain: 'jiu', translation: 'then, at once' },
  { id: 2, hanzi: '时间', pinyinPlain: 'shijian', translation: 'time' },
  { id: 3, hanzi: '图书馆', pinyinPlain: 'tushuguan', translation: 'library' },
  { id: 4, hanzi: '不好意思', pinyinPlain: 'buhaoyisi', translation: 'excuse me' }
];

const values = SAMPLE.map((row) => `(${row.id}, '${row.hanzi}', '${row.pinyinPlain}', '${row.translation}')`).join(
  ', '
);

// Per-character fallback: characters separated by spaces so unicode61 can tokenize them.
const charValues = SAMPLE.map((row) => `(${row.id}, '${[...row.hanzi].join(' ')}', '${row.pinyinPlain}')`).join(', ');

const probes: Probe[] = [
  {
    name: 'cleanup-before',
    question: 'Drop anything left over from a previous run',
    sql: `drop table if exists spike_ext;
          drop table if exists spike_trigram;
          drop table if exists spike_chars;
          drop table if exists spike_source;`
  },
  {
    name: 'fts5-available',
    question: 'Is FTS5 compiled into the D1 build of SQLite?',
    sql: `create virtual table spike_source using fts5(hanzi, pinyin_plain, translation);`,
    verdict: () => 'FTS5 is available'
  },
  {
    name: 'trigram-create',
    question: `Does tokenize='trigram' work?`,
    sql: `create virtual table spike_trigram using fts5(hanzi, pinyin_plain, translation, tokenize='trigram');`,
    verdict: () => 'trigram tokenizer accepted'
  },
  {
    name: 'trigram-insert',
    question: 'Can CJK rows be indexed by the trigram tokenizer?',
    sql: `insert into spike_trigram (rowid, hanzi, pinyin_plain, translation) values ${values};`
  },
  {
    name: 'trigram-match-3char',
    question: 'MATCH on a three character word (图书馆)',
    sql: `select rowid, hanzi from spike_trigram where spike_trigram match '图书馆';`,
    verdict: (rows) => (rows.length > 0 ? `found ${rows.length} row(s)` : 'NO MATCH')
  },
  {
    name: 'trigram-match-2char',
    question: 'MATCH on a two character word (时间), the common HSK case',
    sql: `select rowid, hanzi from spike_trigram where spike_trigram match '时间';`,
    verdict: (rows) => (rows.length > 0 ? `found ${rows.length} row(s)` : 'NO MATCH')
  },
  {
    name: 'trigram-match-1char',
    question: 'MATCH on a single character (就)',
    sql: `select rowid, hanzi from spike_trigram where spike_trigram match '就';`,
    verdict: (rows) => (rows.length > 0 ? `found ${rows.length} row(s)` : 'NO MATCH')
  },
  {
    name: 'trigram-like-2char',
    question: `LIKE '%时间%' on a trigram table, the documented substring path`,
    sql: `select rowid, hanzi from spike_trigram where hanzi like '%时间%';`,
    verdict: (rows) => (rows.length > 0 ? `found ${rows.length} row(s)` : 'NO MATCH')
  },
  {
    name: 'trigram-substring-mid',
    question: 'MATCH on a substring starting mid word (好意思 inside 不好意思)',
    sql: `select rowid, hanzi from spike_trigram where spike_trigram match '好意思';`,
    verdict: (rows) => (rows.length > 0 ? `found ${rows.length} row(s)` : 'NO MATCH')
  },
  {
    name: 'trigram-pinyin',
    question: 'Tone stripped pinyin substring search (shi inside shijian)',
    sql: `select rowid, hanzi from spike_trigram where spike_trigram match 'shi';`,
    verdict: (rows) => (rows.length > 0 ? `found ${rows.length} row(s)` : 'NO MATCH')
  },
  {
    name: 'chars-create',
    question: 'Fallback: standard FTS5 over space separated characters',
    sql: `create virtual table spike_chars using fts5(hanzi_chars, pinyin_plain);`
  },
  {
    name: 'chars-insert',
    question: 'Index the same words as separated characters',
    sql: `insert into spike_chars (rowid, hanzi_chars, pinyin_plain) values ${charValues};`
  },
  {
    name: 'chars-match-2char',
    question: 'Phrase MATCH on two characters ("时 间")',
    sql: `select rowid, hanzi_chars from spike_chars where spike_chars match '"时 间"';`,
    verdict: (rows) => (rows.length > 0 ? `found ${rows.length} row(s)` : 'NO MATCH')
  },
  {
    name: 'chars-match-1char',
    question: 'MATCH on one character (就)',
    sql: `select rowid, hanzi_chars from spike_chars where spike_chars match '就';`,
    verdict: (rows) => (rows.length > 0 ? `found ${rows.length} row(s)` : 'NO MATCH')
  },
  {
    name: 'chars-match-mid',
    question: 'Phrase MATCH starting mid word ("好 意 思")',
    sql: `select rowid, hanzi_chars from spike_chars where spike_chars match '"好 意 思"';`,
    verdict: (rows) => (rows.length > 0 ? `found ${rows.length} row(s)` : 'NO MATCH')
  },
  {
    name: 'chars-prefix',
    question: 'Prefix MATCH on pinyin (shi*)',
    sql: `select rowid, hanzi_chars from spike_chars where spike_chars match 'shi*';`,
    verdict: (rows) => (rows.length > 0 ? `found ${rows.length} row(s)` : 'NO MATCH')
  },
  {
    name: 'bm25-ranking',
    question: 'Is bm25() available for ordering results?',
    sql: `select rowid, bm25(spike_chars) as score from spike_chars where spike_chars match '就' order by score;`,
    verdict: (rows) => (rows.length > 0 ? 'bm25 available' : 'no rows')
  },
  {
    name: 'external-content',
    question: 'Does an external content table (content=) work?',
    sql: `create virtual table spike_ext using fts5(hanzi_chars, content='spike_chars', content_rowid='rowid');`,
    verdict: () => 'external content accepted'
  },
  {
    name: 'cleanup-after',
    question: 'Remove the spike tables',
    sql: `drop table if exists spike_ext;
          drop table if exists spike_trigram;
          drop table if exists spike_chars;
          drop table if exists spike_source;`
  }
];

const introspection = [
  { fn: 'sqlite_version()', sql: `select sqlite_version() as v;` },
  { fn: 'pragma compile_options', sql: `pragma compile_options;` },
  { fn: 'pragma table_list', sql: `pragma table_list;` },
  { fn: 'fts5 shadow tables visible', sql: `select name from sqlite_master where name like '%_fts%' limit 5;` }
];

/*
 * Scale phase.
 *
 * EXPLAIN QUERY PLAN reports `VIRTUAL TABLE INDEX 0:L0` for a LIKE against a trigram table whether or not the trigram index can actually serve it, so the plan cannot answer the question that matters.
 * Timing can: compare each query against an ordinary table doing a known full scan.
 */
const HANZI_POOL = [
  ...'的一是不了人我在有他这为之大来以个中上们到说国和地也子时道出而要于就下得可你年生自会那后能对着事其里所去行过家十用发天如然作方成者多日都三小军二无同么经法当起与好看学进种将还分此心前面又定见只主没公从图书馆意思'
];

/** Deterministic pseudo random source, so two runs are comparable. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function buildCorpus(rows: number): string[] {
  const random = makeRandom(20260913);
  const words: string[] = [];

  for (let index = 0; index < rows; index += 1) {
    const length = 1 + Math.floor(random() * 4);
    let word = '';
    for (let position = 0; position < length; position += 1) {
      word += HANZI_POOL[Math.floor(random() * HANZI_POOL.length)];
    }
    words.push(word);
  }

  // Plant the needles: as standalone words and buried inside longer ones.
  words[10] = '时间';
  words[5000] = '时间';
  words[15000] = '有时间了';
  words[11] = '图书馆';
  words[5001] = '图书馆';
  words[15001] = '去图书馆看';

  return words;
}

function insertStatements(table: string, columns: string, values: string[]): string {
  const batches: string[] = [];
  for (let index = 0; index < values.length; index += 500) {
    batches.push(`insert into ${table} ${columns} values ${values.slice(index, index + 500).join(', ')};`);
  }
  return batches.join('\n');
}

async function timeQuery(label: string, sql: string): Promise<void> {
  const runs: number[] = [];
  let rowCount = 0;
  let failure: string | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const outcome = await runSql(sql);
    if (!outcome.ok) {
      failure = outcome.error;
      break;
    }
    rowCount = outcome.rows.length;
    if (outcome.durationMs !== null) {
      runs.push(outcome.durationMs);
    }
  }

  if (failure) {
    console.log(`  ${label.padEnd(38)} FAILED  ${failure}`);
    return;
  }

  const best = runs.length > 0 ? Math.min(...runs) : Number.NaN;
  console.log(`  ${label.padEnd(38)} ${best.toFixed(1).padStart(8)} ms   ${rowCount} row(s)`);
}

async function scalePhase(): Promise<void> {
  console.log(`\nScale phase: ${SCALE_ROWS.toLocaleString('en-US')} rows\n${'-'.repeat(60)}\n`);

  const words = buildCorpus(SCALE_ROWS);
  const plainValues = words.map((word, index) => `(${index + 1}, '${word}')`);
  const charValuesAtScale = words.map((word, index) => `(${index + 1}, '${[...word].join(' ')}')`);

  const setup = [
    `drop table if exists spike_scale_plain;`,
    `drop table if exists spike_scale_tg;`,
    `drop table if exists spike_scale_ch;`,
    `create table spike_scale_plain (id integer primary key, hanzi text not null);`,
    `create virtual table spike_scale_tg using fts5(hanzi, tokenize='trigram');`,
    `create virtual table spike_scale_ch using fts5(hanzi_chars);`,
    insertStatements('spike_scale_plain', '(id, hanzi)', plainValues),
    insertStatements('spike_scale_tg', '(rowid, hanzi)', plainValues),
    insertStatements('spike_scale_ch', '(rowid, hanzi_chars)', charValuesAtScale)
  ].join('\n');

  const directory = await mkdtemp(join(tmpdir(), 'juka-fts5-'));
  const file = join(directory, 'scale.sql');
  await writeFile(file, setup, 'utf8');

  console.log('  loading corpus, this takes a moment');
  const loaded = await runSqlFile(file);
  if (!loaded.ok) {
    console.log(`  corpus load FAILED: ${loaded.error}`);
    return;
  }
  console.log('  corpus loaded\n');

  await timeQuery('plain table LIKE 2 char (full scan)', `select id from spike_scale_plain where hanzi like '%时间%'`);
  await timeQuery('trigram LIKE 2 char', `select rowid from spike_scale_tg where hanzi like '%时间%'`);
  await timeQuery('trigram LIKE 3 char', `select rowid from spike_scale_tg where hanzi like '%图书馆%'`);
  await timeQuery('trigram MATCH 3 char', `select rowid from spike_scale_tg where spike_scale_tg match '图书馆'`);
  await timeQuery(
    'per character MATCH 2 char phrase',
    `select rowid from spike_scale_ch where spike_scale_ch match '"时 间"'`
  );
  await timeQuery(
    'per character MATCH 3 char phrase',
    `select rowid from spike_scale_ch where spike_scale_ch match '"图 书 馆"'`
  );
  await timeQuery('per character MATCH 1 char', `select rowid from spike_scale_ch where spike_scale_ch match '就'`);

  await runSql(`drop table if exists spike_scale_plain;
                drop table if exists spike_scale_tg;
                drop table if exists spike_scale_ch;`);
  console.log('\n  scale tables dropped');
}

async function main() {
  console.log(`\nFTS5 spike against D1 (${REMOTE ? 'remote' : 'local'})\n${'='.repeat(60)}\n`);

  const results: { name: string; ok: boolean; note: string }[] = [];

  for (const probe of probes) {
    const outcome = await runSql(probe.sql);
    const note = outcome.ok
      ? (probe.verdict?.(outcome.rows) ?? `ok, ${outcome.rows.length} row(s)`)
      : (outcome.error ?? 'failed');

    results.push({ name: probe.name, ok: outcome.ok, note });
    console.log(`${outcome.ok ? 'PASS' : 'FAIL'}  ${probe.name.padEnd(22)} ${probe.question}`);
    console.log(`      ${note}\n`);
  }

  console.log(`\nIntrospection, which D1 may block\n${'-'.repeat(60)}\n`);
  for (const probe of introspection) {
    const outcome = await runSql(probe.sql);
    console.log(`${outcome.ok ? 'ALLOWED' : 'BLOCKED'}  ${probe.fn}`);
    console.log(`         ${outcome.ok ? JSON.stringify(outcome.rows.slice(0, 3)) : outcome.error}`);
  }

  const failed = results.filter((result) => !result.ok);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${results.length - failed.length} of ${results.length} probes passed`);
  if (failed.length > 0) {
    console.log(`failed: ${failed.map((result) => result.name).join(', ')}`);
  }

  if (SCALE) {
    await scalePhase();
  } else {
    console.log('\nRun again with --scale to time the approaches over a large corpus.');
  }
}

await main();
