// The one I/O layer for the project ledger (rule 7, D-017): the only module that reads or appends
// `<project>/.visionboard/ledger.jsonl`. Every line is checked on read and every event before it is
// written. The server stamps `v`, `seq`, `at`, `by` and `agent`, and assigns node numbers and
// versions, so a request body can never claim them. Node is single-threaded and the append is
// synchronous, so writes are applied one at a time (PLAN key change 2).
import fs from 'node:fs';
import path from 'node:path';
import type { ActEvent, LedgerEvent, LedgerIndex } from '../../../packages/format/src/index.ts';
import {
  LEDGER_FORMAT, contextProblems, eventProblems, indexEvent, readLedger,
} from '../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../packages/actions/src/index.ts';
import { applyEvent, foldLedger, validateAct } from '../../../packages/actions/src/index.ts';
import { HttpError } from './guard.ts';

export const DATA_DIR = '.visionboard';
export const LEDGER_FILE = 'ledger.jsonl';

/** Who is writing. Set by the server from the route, never from the request body (D-019). */
export type Caller = { by: 'person' } | { by: 'agent'; agent: string };

export interface Ledger {
  readonly file: string;
  /** Problems found when the file was opened, as "line N: ...". */
  readonly problems: readonly string[];
  /** Stamp, check and append one event. Throws HttpError 422 with every problem, writing nothing. */
  append(input: unknown, caller: Caller): LedgerEvent;
  /** The folded state, kept current on every append. */
  state(): LedgerState;
  /** Called after each append. Returns an unsubscribe. */
  onAppend(fn: (e: LedgerEvent) => void): () => void;
}

/** Fields only the server writes; dropped from every request body. */
const STAMPED = ['v', 'seq', 'at', 'by', 'agent', 'person'] as const;

export const ledgerPath = (projectDir: string): string =>
  path.join(path.resolve(projectDir), DATA_DIR, LEDGER_FILE);

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Highest integer `seq` on any line that parses, valid or not. */
function highestSeq(lines: string[]): number {
  let max = 0;
  for (const line of lines) {
    try {
      const seq = (JSON.parse(line) as { seq?: unknown } | null)?.seq;
      if (Number.isInteger(seq)) max = Math.max(max, seq as number);
    } catch { /* not JSON; already reported by readLedger */ }
  }
  return max;
}

/** The body with the server's stamp. A new node (no `n`) gets the next number; every node event
 * gets the next version. */
function stamp(input: unknown, caller: Caller, seq: number, ix: LedgerIndex): Rec {
  const body: Rec = isRec(input) ? { ...input } : {};
  for (const k of STAMPED) delete body[k];
  const e: Rec = {
    v: LEDGER_FORMAT, seq, at: new Date().toISOString(), by: caller.by,
    ...(caller.by === 'agent' && { agent: caller.agent }), ...body,
  };
  if (body.type === 'node') {
    const known = typeof body.n === 'number' ? ix.nodes.get(body.n) : undefined;
    if (body.n === undefined) e.n = ix.maxN + 1;
    e.ver = (known?.ver ?? 0) + 1;
  }
  return e;
}

/** Every problem with appending `e` now: shape, then context, then the action rules. */
function check(input: unknown, e: Rec, ix: LedgerIndex, s: LedgerState): string[] {
  if (!isRec(input)) return ['event: must be an object'];
  if (input.type === 'node' && Number.isInteger(input.n) && !ix.nodes.has(input.n as number))
    return [`n: unknown node ${String(input.n)}; leave n out to create a node`];
  const shape = eventProblems(e);
  if (shape.length) return shape;
  const event = e as unknown as LedgerEvent;
  const context = contextProblems(ix, event);
  if (context.length || event.type !== 'act') return context;
  return validateAct(event as ActEvent, s);
}

/** Open a ledger file (absent = empty). Bad lines are reported through `warn` and skipped, so one
 * bad line never hides the rest. The next `seq` is above every `seq` seen, valid or not. */
export function openLedger(file: string, warn: (m: string) => void = (m) => console.error(m)): Ledger {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const lines = text.split('\n');
  const read = readLedger(lines);
  for (const m of read.problems) warn(`ledger: ${m}`);
  const ix = read.index;
  ix.seq = Math.max(ix.seq, highestSeq(lines));
  const s = foldLedger(read.events);
  const listeners = new Set<(e: LedgerEvent) => void>();
  // A torn last line (no newline) must not swallow the next event.
  let torn = text.length > 0 && !text.endsWith('\n');

  return {
    file,
    problems: read.problems,
    state: () => s,
    onAppend(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    append(input, caller) {
      const e = stamp(input, caller, ix.seq + 1, ix);
      const problems = check(input, e, ix, s);
      if (problems.length) throw new HttpError(422, 'Invalid event', problems);
      const event = e as unknown as LedgerEvent;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, `${torn ? '\n' : ''}${JSON.stringify(event)}\n`);
      torn = false;
      indexEvent(ix, event);
      applyEvent(s, event);
      for (const fn of [...listeners]) {
        try { fn(event); } catch (err) { warn(`ledger: listener failed: ${String(err)}`); }
      }
      return event;
    },
  };
}
