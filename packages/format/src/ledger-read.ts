// Reading a whole ledger, or one line of it, against the index (D-019): the JSON, the shape of each
// line (`eventProblems`), the event code reads (`fromLine`), then the rules in context (`contextProblems`).
// Split out of ledger-index.ts (ARCH_06) so the server's ledger can read a line another writer
// appended (`readLine`) as `readLedger` reads one on open.
import type { LedgerEvent } from './ledger.ts';
import type { LedgerIndex } from './ledger-index.ts';
import { contextProblems, emptyIndex, indexEvent } from './ledger-index.ts';
import { eventProblems } from './ledger-shape.ts';
import { fromLine } from './ledger-line.ts';
import * as formatLedgerWords from './words/format-ledger.ts';

export interface ReadLedger { events: LedgerEvent[]; problems: string[]; index: LedgerIndex }

/** One line read in context: the event the code reads, or what is wrong with it (`notJSON`, or the
 * shape and context `problems`). */
export type LineRead = { event: LedgerEvent } | { event?: undefined; notJSON: boolean; problems: string[] };

/** Check one non-blank line against `index`: its JSON, its shape (`eventProblems`), then the event
 * code reads (`fromLine`) in context (`contextProblems`). A bad line moves `index.seq` on so the
 * next `seq` is above it, and the rest are not blamed for it (D-019). A good one is returned, not
 * indexed: the caller takes it in (`indexEvent`). The one check `readLedger` and a ledger following
 * another writer's appends both run. */
export function readLine(index: LedgerIndex, line: string): LineRead {
  let e: unknown;
  try { e = JSON.parse(line); } catch { index.seq += 1; return { notJSON: true, problems: [] }; }
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
  const index = emptyIndex();
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    const read = readLine(index, line);
    if (read.event) {
      indexEvent(index, read.event);
      events.push(read.event);
    } else if (read.notJSON) problems.push(formatLedgerWords.lineNotJSON(i + 1));
    else problems.push(...read.problems.map((x) => formatLedgerWords.line(i + 1, x)));
  });
  return { events, problems, index };
}

/** Every problem in a whole ledger. Empty means valid. */
export const validateLedger = (lines: string[]): string[] => readLedger(lines).problems;
