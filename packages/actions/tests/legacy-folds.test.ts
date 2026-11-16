// The frozen truth of the ledger migration (D-103; ledger review R4, § 3 Tests). `packages/format/fixtures/legacy/`
// holds today's fixture ledgers, the performance ledger and a ledger of mixed formats (7 to 19) shaped like a real
// one, each beside what the code of 2026-11-16 (ledger format 19, before any migration existed) folded it to: the
// reader's problems, the head, and every board's view and state. Written once by BE_02 step 1 with that code.
// NO TASK EDITS THE FILES IN `fixtures/legacy/`, EVER: once the old reader is gone they are the only proof that a
// migrated ledger shows the same boards. A change of the fold's shape (a field renamed) maps the frozen result in
// this test, never the frozen file.
// Two holds: the file read as it lies folds to its result (true while the reader still reads old formats; BE_03
// removes this one), and the file migrated (`upgradeLines`) folds to the same result, line for line.
// Format 20 (T_01) renamed the flag Bookmark: the fold's `flags` is `bookmarks` (mapped here in `renamed`), and a
// `flag` line no longer reads as it lies, only migrated, so the first hold is kept for the files that hold none.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { boardView, readLedger, upgradeLines } from '#format';
import { FIXTURES_DIR } from '#format/files';
import { boardState, foldLedger } from '../src/index.ts';

const LEGACY = `${FIXTURES_DIR}legacy/`;
const NAMES = fs.readdirSync(LEGACY).filter((f) => f.endsWith('.ledger.jsonl')).map((f) => f.slice(0, -'.ledger.jsonl'.length));

/** Maps and Sets as plain JSON, keys in insertion order: how the results were written. */
const plain = (v: unknown): unknown => {
  if (v instanceof Map) return Object.fromEntries([...v].map(([k, x]) => [String(k), plain(x)]));
  if (v instanceof Set) return [...v].map(plain);
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
};

/** What the code folds `lines` to, in the frozen results' shape. */
function foldOf(lines: string[]): unknown {
  const read = readLedger(lines);
  const s = foldLedger(read.events);
  return JSON.parse(JSON.stringify({
    problems: read.problems, head: s.seq,
    boards: Object.fromEntries([...s.boards.keys()].map((b) => [b, { view: plain(boardView(s, b)), state: plain(boardState(s, b)) }])),
  }));
}

const linesOf = (name: string): string[] => fs.readFileSync(`${LEGACY}${name}.ledger.jsonl`, 'utf8').split('\n').filter(Boolean);

/** A frozen result in the fold's shape now: format 20 renamed each board state's `flags` to `bookmarks`. */
function renamed(result: { boards: Record<string, { state: Record<string, unknown> }> }): unknown {
  for (const b of Object.values(result.boards)) {
    const { flags, ...rest } = b.state;
    b.state = { ...rest, bookmarks: flags };
  }
  return result;
}
const frozen = (name: string): unknown => renamed(JSON.parse(fs.readFileSync(`${LEGACY}${name}.fold.json`, 'utf8')));
/** A file with a `flag` or `unflag` line, which format 20 reads only migrated (a `bookmark`). */
const holdsFlags = (name: string): boolean => linesOf(name).some((l) => /"action":"(un)?flag"/.test(l));

test('the frozen set: every fixture, the performance ledger and the mixed one, each with its result', () => {
  assert.deepEqual(NAMES.sort(), ['gallery', 'login-layout', 'login-review', 'mixed', 'perf', 'roadmap']);
  for (const name of NAMES) assert.ok(fs.existsSync(`${LEGACY}${name}.fold.json`), name);
});

test('the mixed ledger is shaped like a real one: formats 7 to 19, four boards, 58 cards, about 250 lines', () => {
  const lines = linesOf('mixed').map((l) => JSON.parse(l) as { v: number; type: string; n?: number });
  assert.deepEqual([...new Set(lines.map((e) => e.v))].sort((a, b) => a - b), [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
  assert.ok(lines.length >= 240 && lines.length <= 260, String(lines.length));
  assert.equal(new Set(lines.filter((e) => e.type === 'node').map((e) => e.n)).size, 58);
  assert.equal(lines.filter((e) => e.type === 'board' && e.v !== 9).length, 4);
});

test('the frozen files that hold a flag are the gallery and the mixed ledger: each folds to its bookmarks migrated', () => {
  assert.deepEqual(NAMES.filter(holdsFlags).sort(), ['gallery', 'mixed']);
});

for (const name of NAMES.filter((x) => !holdsFlags(x))) {
  test(`${name}: read as it lies, today's code folds it to its frozen result`, () => {
    assert.deepEqual(foldOf(linesOf(name)), frozen(name));
  });
}

for (const name of NAMES) {
  test(`${name}: migrated, it folds to the same frozen result, line for line`, () => {
    const lines = linesOf(name);
    const migrated = upgradeLines(lines);
    assert.deepEqual([migrated.stops, migrated.newer], [[], []]);
    assert.equal(migrated.lines.length, lines.length);
    assert.deepEqual(foldOf(migrated.lines), frozen(name));
  });
}
