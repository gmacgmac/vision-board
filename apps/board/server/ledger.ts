// The one I/O layer for the project ledger (rule 7, D-017): the only module that reads or appends
// `<project>/.visionboard/ledger.jsonl`. Every line is checked on read and every event before it is
// written. The server stamps `v`, `seq`, `at`, `by` and `agent`, and assigns card identities and
// versions, so a request body can never claim them. `append` takes a line as the file holds it
// (a card by its identity, `n`; board numbers are turned into identities first, edge.ts). Each
// stamped line is checked against the stored-line JSON Schema first (unknown fields are refused,
// never stored, api.md 7) and the hand rules; then the event code reads (`fromLine`) by the act
// rules and the context, whose words name cards by board number (api.md 125). Node is
// single-threaded and the append is synchronous, so writes are applied one at a time (PLAN key
// change 2, api.md 33).
import fs from 'node:fs';
import path from 'node:path';
import type { ActEvent, LedgerEvent, LedgerIndex } from '../../../packages/format/src/index.ts';
import {
  LEDGER_FORMAT, contextProblems, eventProblems, fromLine, indexEvent, readLedger,
} from '../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../packages/actions/src/index.ts';
import { applyEvent, cardName, foldLedger, validateAct, writeProblem } from '../../../packages/actions/src/index.ts';
import type { PointerError } from './problem.ts';
import { pointerError, problem } from './problem.ts';
import { ledgerLineProblems } from './schema.ts';

export const DATA_DIR = '.visionboard';
export const LEDGER_FILE = 'ledger.jsonl';

/** Who is writing. Set by the server from the route, never from the request body (D-019). */
export type Caller = { by: 'person' } | { by: 'agent'; agent: string };

export interface Ledger {
  readonly file: string;
  /** Problems found when the file was opened, as "line N: ...". */
  readonly problems: readonly string[];
  /** Stamp, check and append one line (cards by identity, as the file holds them). Throws an
   * `invalid` problem with every error (`locked` on a locked board), writing nothing. `board`: the
   * board the route names; an act must stay on it. Returns the event as code reads it (`fromLine`). */
  append(input: unknown, caller: Caller, opts?: { board?: string }): LedgerEvent;
  /** The folded state, kept current on every append. */
  state(): LedgerState;
  /** Every valid line, oldest first, as code reads it; `toLine` gives the line (`read_ledger`). */
  events(): readonly LedgerEvent[];
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

/** The body with the server's stamp. A new node (no `n`) gets the next identity; every node event
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
    if (body.n === undefined) e.n = ix.maxId + 1;
    e.ver = (known?.ver ?? 0) + 1;
  }
  return e;
}

/** The wrong caller for an event: `by` is stamped from the route, so the schema refusing it
 * means a person route was used for an agent's event, or the reverse. */
const wrongCaller = (e: Rec): PointerError => ({
  pointer: '',
  detail: e.by === 'agent'
    ? 'only the person can do this, on the board; send a propose or reply item instead'
    : `only an agent writes a ${String(e.type)} event`,
});

/** Every problem with appending `e` now: the stored-line schema, then the hand shape rules, then the
 * one "may this line be written" check (`writeProblem`): a line on an archived board (an agent's is
 * never written there, api.md 136), or on a locked one, which throws `locked` (423, api.md 139), then
 * an act's action rules, so the person reads their plain words first (api.md 93), then the context. */
function check(input: unknown, e: Rec, ix: LedgerIndex, s: LedgerState, board?: string): PointerError[] {
  if (!isRec(input)) return [{ pointer: '', detail: 'the event must be an object' }];
  const hand = (list: string[]) => list.map((t) => pointerError(t, e));
  if (input.type === 'node' && Number.isInteger(input.n) && !ix.nodes.has(input.n as number))
    return hand([`n: unknown node ${String(input.n)}; leave n out to create a node`]);
  const schema = ledgerLineProblems(JSON.stringify(e));
  if (schema.length) return schema.some((p) => p.pointer === '/by') ? [wrongCaller(e)] : schema;
  const shape = eventProblems(e);
  if (shape.length) return hand(shape);
  const event = fromLine(e);
  const refused = writeProblem(s, event);
  if (refused?.code === 'locked') throw problem('locked', refused.detail);
  if (refused) return hand([refused.detail]);
  const rules = event.type === 'act' ? validateAct(event as ActEvent, s, board) : [];
  return hand(rules.length ? rules : contextProblems(ix, event, cardName(s)));
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
  const events: LedgerEvent[] = [...read.events];
  const listeners = new Set<(e: LedgerEvent) => void>();
  // A torn last line (no newline) must not swallow the next event.
  let torn = text.length > 0 && !text.endsWith('\n');

  return {
    file,
    problems: read.problems,
    state: () => s,
    events: () => events,
    onAppend(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    append(input, caller, opts = {}) {
      const e = stamp(input, caller, ix.seq + 1, ix);
      const errors = check(input, e, ix, s, opts.board);
      if (errors.length) {
        throw problem('invalid', 'The event does not fit the ledger. Fix the fields listed in errors and send it again.', { errors });
      }
      const event = fromLine(e);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, `${torn ? '\n' : ''}${JSON.stringify(e)}\n`);
      torn = false;
      events.push(event);
      indexEvent(ix, event);
      applyEvent(s, event);
      for (const fn of [...listeners]) {
        try { fn(event); } catch (err) { warn(`ledger: listener failed: ${String(err)}`); }
      }
      return event;
    },
  };
}
