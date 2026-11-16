// Reading a whole ledger, or one line of it, against the index (D-019): the JSON, the shape of each
// line (`eventProblems`), the event code reads (`fromLine`), then the rules in context (`contextProblems`).
// Split out of ledger-index.ts (ARCH_06) so the server's ledger can read a line another writer
// appended (`readLine`) as `readLedger` reads one on open. A line written in a newer format than this build's is its
// own kind, not a shape problem (D-103 4): the ledger it is in opens read-only (apps/board/server/ledger.ts).
import type { LedgerEvent } from './ledger.ts';
import { LEDGER_FORMAT } from './ledger.ts';
import type { LedgerIndex } from './ledger-index.ts';
import { contextProblems, emptyIndex, indexEvent } from './ledger-index.ts';
import { eventProblems } from './ledger-shape.ts';
import { fromLine } from './ledger-line.ts';
import * as formatLedgerWords from './words/format-ledger.ts';

/** `newer`: the lines (1-based) written in a format newer than this build's, left out of `events` and `problems`. */
export interface ReadLedger { events: LedgerEvent[]; problems: string[]; index: LedgerIndex; newer: number[] }

/** One line read in context: the event the code reads, or what is wrong with it (`notJSON`, or the
 * shape and context `problems`), or the newer format it was written in (`newer`, its problems left empty). */
export type LineRead = { event: LedgerEvent } | { event?: undefined; notJSON: boolean; newer?: number; problems: string[] };

/** The format `e` was written in, when it is newer than this build's. */
const newerFormat = (e: unknown): number | undefined => {
  const v = (e as { v?: unknown } | null)?.v;
  return Number.isInteger(v) && (v as number) > LEDGER_FORMAT ? (v as number) : undefined;
};

/** Check one non-blank line against `index`: its JSON, its shape (`eventProblems`), then the event
 * code reads (`fromLine`) in context (`contextProblems`). A bad line moves `index.seq` on so the
 * next `seq` is above it, and the rest are not blamed for it (D-019). A good one is returned, not
 * indexed: the caller takes it in (`indexEvent`). The one check `readLedger` and a ledger following
 * another writer's appends both run. */
export function readLine(index: LedgerIndex, line: string): LineRead {
  let e: unknown;
  try { e = JSON.parse(line); } catch { index.seq += 1; return { notJSON: true, problems: [] }; }
  const newer = newerFormat(e);
  if (newer !== undefined) {
    const seq = (e as { seq?: unknown }).seq;
    if (Number.isInteger(seq)) index.seq = Math.max(index.seq, seq as number);
    return { notJSON: false, newer, problems: [] };
  }
  let problems = eventProblems(e);
  const event = problems.length ? undefined : fromLine(e as Record<string, unknown>);
  if (event) problems = contextProblems(index, event);
  if (event && !problems.length) return { event };
  const seq = (e as { seq?: unknown } | null)?.seq;
  if (Number.isInteger(seq)) index.seq = Math.max(index.seq, seq as number); // one bad line, not a cascade
  return { notJSON: false, problems };
}

/** Parse and check a whole ledger: each line's shape as the file holds it, then the event code
 * reads (`fromLine`) in context. `events` holds the valid events in order; `problems` every
 * problem as "line N: ...". Lines with problems are skipped, so one bad event is reported without
 * hiding the rest (D-019). */
export function readLedger(lines: string[]): ReadLedger {
  const events: LedgerEvent[] = [];
  const problems: string[] = [];
  const newer: number[] = [];
  const index = emptyIndex();
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    const read = readLine(index, line);
    if (read.event) {
      indexEvent(index, read.event);
      events.push(read.event);
    } else if (read.newer !== undefined) newer.push(i + 1);
    else if (read.notJSON) problems.push(formatLedgerWords.lineNotJSON(i + 1));
    else problems.push(...read.problems.map((x) => formatLedgerWords.line(i + 1, x)));
  });
  return { events, problems, index, newer };
}

/** Every problem in a whole ledger, a line in a newer format among them (this build can't check it). Empty means valid. */
export function validateLedger(lines: string[]): string[] {
  const read = readLedger(lines);
  const newer = read.newer.map((i) => formatLedgerWords.lineNewer(i, newerFormat(JSON.parse(lines[i - 1]!))!, LEDGER_FORMAT));
  return [...read.problems, ...newer];
}
