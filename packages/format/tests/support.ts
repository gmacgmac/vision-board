// The format's test support (`#format/testing`, D-060): what any module's tests need to build or
// read a ledger, so no test keeps its own copy. The fixture ledgers by name, a line builder stamped
// with the format (LEDGER_FORMAT unless a test pins an older one), a check that lines read clean, a
// temp folder, and the performance fixture (perf-ledger.ts). Not a test itself (no .test.ts).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { LedgerEvent } from '../src/index.ts';
import { LEDGER_FORMAT, readLedger } from '../src/index.ts';
import { FIXTURES_DIR } from '../src/files.ts';

export { BIG, perfLedger } from './perf-ledger.ts';

/** The fixture ledgers (packages/format/fixtures/), each a real project ledger in the real schema. */
export const FIXTURE_LEDGERS = {
  roadmap: `${FIXTURES_DIR}roadmap.ledger.jsonl`,
  loginReview: `${FIXTURES_DIR}login-review.ledger.jsonl`,
  loginLayout: `${FIXTURES_DIR}login-layout.ledger.jsonl`,
  /** The gallery's ledger: every kind in every state it can reach (apps/board/src/gallery/). */
  gallery: `${FIXTURES_DIR}gallery.ledger.jsonl`,
} as const;

/** A fixture ledger's lines (blank lines dropped). */
export const fixtureLines = (name: keyof typeof FIXTURE_LEDGERS): string[] =>
  fs.readFileSync(FIXTURE_LEDGERS[name], 'utf8').split('\n').filter(Boolean);

/** A fresh folder in the system temp folder, named `<prefix>` and six random characters. Wrap it in
 * `fs.realpathSync` where a test compares paths a server resolved (macOS links /var to /private/var). */
export const makeTempDir = (prefix = 'vb-test-'): string => fs.mkdtempSync(path.join(os.tmpdir(), prefix));

/** Ledger lines with `seq` counted from 1: `line(e)` stamps `v`, the next `seq` and its time. */
export interface LineMaker {
  line(e: object): string;
  /** The last `seq` given. */
  readonly seq: number;
  /** Start again from seq 1. */
  reset(): void;
}

/**
 * A line builder. `v` is the format the lines claim (LEDGER_FORMAT unless the test is about an older
 * one). `at` is the time of line `seq`: a function, or an hour (`2026-10-11T11`) whose minute is the
 * seq, so a test can name the time a line was written.
 */
export function lineMaker({ v = LEDGER_FORMAT, at = '2026-10-01T10' }: { v?: number; at?: string | ((seq: number) => string) } = {}): LineMaker {
  let seq = 0;
  const time = typeof at === 'function' ? at : (n: number) => `${at}:${String(n).padStart(2, '0')}:00Z`;
  return {
    line: (e) => JSON.stringify({ v, seq: ++seq, at: time(seq), ...e }),
    get seq() { return seq; },
    reset() { seq = 0; },
  };
}

/** The lines' events, failing on any problem readLedger finds: a test never folds an invalid ledger. */
export function checkedEvents(lines: string[]): LedgerEvent[] {
  const read = readLedger(lines);
  if (read.problems.length) throw new Error(`the test ledger is invalid:\n${read.problems.join('\n')}`);
  return read.events;
}
