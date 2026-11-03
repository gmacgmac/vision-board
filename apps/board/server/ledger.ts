// The one I/O layer for the project ledger (rule 7, D-017): the only module that reads or appends
// the ledger file (`ledgerFiles(dir).ledger`, data-folder.ts). Every line is checked on read and every event before it is
// written. The server stamps `v`, `seq`, `at`, `by` and `agent`, and assigns card identities and
// versions, so a request body can never claim them. `append` takes a line as the file holds it
// (a card by its identity, `n`; board numbers are turned into identities first, edge.ts). Each
// stamped line is checked against the stored-line JSON Schema first (unknown fields are refused,
// never stored, api.md 7) and the hand rules; then the event code reads (`fromLine`) by the act
// rules and the context, whose words name cards by board number (api.md 125). Node is
// single-threaded and the append is synchronous, so writes are applied one at a time (PLAN key
// change 2, api.md 33). Lines another writer appended (another engine or process on the same file)
// are read in by `refresh`, before every append and while someone `follow`s the file, so the fold
// and the next `seq` stay current and every listener hears of them too. A file replaced rather than grown (a git
// pull, a sync, a copy dropped in: another inode, shorter, or its first bytes changed) is read again from the start
// and every reset listener is told (D-085 6). While the host's read-only check says so, nothing is appended at all
// (`read-only`, D-085 3): the one gate every line passes, whoever writes it.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ActEvent, LedgerEvent, LedgerIndex } from '#format';
import {
  LEDGER_FORMAT, contextProblems, eventProblems, fromLine, indexEvent, ledgerFiles, ledgerFolder, readLedger, readLine,
} from '#format';
import type { LedgerState } from '#actions';
import { applyEvent, cardName, foldLedger, READ_ONLY, READ_ONLY_PERSON, validateAct, writeProblem } from '#actions';
import type { PointerError } from './problem.ts';
import { pointerError, problem } from './problem.ts';
import { ledgerLineProblems } from './schema.ts';
import * as serverFoldersWords from './words/server-folders.ts';
import { isRecord } from '#format';

/** Who is writing. Set by the server from the route, never from the request body (D-019). */
export type Caller = { by: 'person' } | { by: 'agent'; agent: string };

export interface Ledger {
  readonly file: string;
  /** Problems found when the file was opened, as "line N: ...". */
  readonly problems: readonly string[];
  /** Stamp, check and append one line (cards by identity, as the file holds them). Throws an
   * `invalid` problem with every error (`locked` on a locked board, `read-only` while the gate says so), writing nothing. `board`: the
   * board the route names; an act must stay on it. Returns the event as code reads it (`fromLine`). */
  append(input: unknown, caller: Caller, opts?: { board?: string }): LedgerEvent;
  /** The folded state, kept current on every append. */
  state(): LedgerState;
  /** Every valid line, oldest first, as code reads it; `toLine` gives the line (`read_ledger`). */
  events(): readonly LedgerEvent[];
  /** Called after each append, this ledger's or another writer's (`refresh`). Returns an unsubscribe. */
  onAppend(fn: (e: LedgerEvent) => void): () => void;
  /** Called after the file was found replaced and read again from the start (`refresh`). Returns an unsubscribe. */
  onReset(fn: () => void): () => void;
  /** True while the host's read-only check says nothing may be appended (`gate`). */
  readOnly(): boolean;
  /** Set the read-only check: while it answers true, `append` throws `read-only` and writes nothing. */
  gate(readOnly: () => boolean): void;
  /** Read in the whole lines another writer appended since this ledger last read the file. */
  refresh(): void;
  /** Look at the file for other writers' lines every `FOLLOW_MS` until the returned stop is called
   * (counted: the file is watched while anyone follows it). */
  follow(): () => void;
}

/** How often a followed ledger file is looked at for another writer's lines. */
export const FOLLOW_MS = 200;

/** Fields only the server writes; dropped from every request body. */
const STAMPED = ['v', 'seq', 'at', 'by', 'agent', 'person'] as const;

/** The ledger file of project folder `projectDir` (resolved), by the paths module. */
export const ledgerPath = (projectDir: string): string => ledgerFiles(ledgerFolder(path.resolve(projectDir))).ledger;

type Rec = Record<string, unknown>;

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
  const body: Rec = isRecord(input) ? { ...input } : {};
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
    ? serverFoldersWords.onlyThePersonCanDo
    : serverFoldersWords.onlyAnAgentWritesA(String(e.type)),
});

/** Every problem with appending `e` now: the stored-line schema, then the hand shape rules, then the
 * one "may this line be written" check (`writeProblem`): a line on an archived board (an agent's is
 * never written there, api.md 136), or on a locked one, which throws `locked` (423, api.md 139), then
 * an act's action rules, so the person reads their plain words first (api.md 93), then the context. */
function check(input: unknown, e: Rec, ix: LedgerIndex, s: LedgerState, board?: string): PointerError[] {
  if (!isRecord(input)) return [{ pointer: '', detail: serverFoldersWords.theEventMustBeAn }];
  const hand = (list: string[]) => list.map((t) => pointerError(t, e));
  if (input.type === 'node' && Number.isInteger(input.n) && !ix.nodes.has(input.n as number))
    return hand([serverFoldersWords.nUnknownNodeLeaveN(String(input.n))]);
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

/** How many of the file's first bytes are kept as a digest: a file whose start changed was replaced. */
const HEAD_BYTES = 4096;

/** What a ledger holds from its file: the lines folded and indexed, and where the file was read to. */
interface Held {
  ix: LedgerIndex;
  s: LedgerState;
  events: LedgerEvent[];
  /** The bytes of the file read so far (this ledger's appends included). */
  size: number;
  /** A torn last line (no newline) must not swallow the next event. */
  torn: boolean;
  /** The file as last looked at: its inode and the digest of its first bytes (up to `HEAD_BYTES`). */
  ino: number;
  head: { length: number; digest: string };
}

const digestOf = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

/** The first `length` bytes of `file` now. */
function headOf(file: string, length: number): Buffer {
  const fd = fs.openSync(file, 'r');
  try {
    const out = Buffer.alloc(length);
    const got = fs.readSync(fd, out, 0, length, 0);
    return out.subarray(0, got);
  } finally { fs.closeSync(fd); }
}

/** Read `file` whole (absent = empty). `whole`: only up to its last newline (a file read again after it was replaced,
 * whose last line may still be being written; it is read with the next growth). */
function readHeld(file: string, warn: (m: string) => void, whole: boolean): Held & { problems: string[] } {
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  const all = stat ? fs.readFileSync(file) : Buffer.alloc(0);
  const raw = whole ? all.subarray(0, all.lastIndexOf(0x0a) + 1) : all;
  const text = raw.toString('utf8');
  const lines = text.split('\n');
  const read = readLedger(lines);
  for (const m of read.problems) warn(`ledger: ${m}`);
  const ix = read.index;
  ix.seq = Math.max(ix.seq, highestSeq(lines));
  const length = Math.min(HEAD_BYTES, raw.length);
  return {
    ix, s: foldLedger(read.events), events: [...read.events], size: raw.length, torn: text.length > 0 && !text.endsWith('\n'),
    ino: stat?.ino ?? 0, head: { length, digest: digestOf(raw.subarray(0, length)) }, problems: read.problems,
  };
}

/** The file is no longer the one held, only longer: another inode, shorter, or its first bytes differ (a git pull,
 * a sync, a copy dropped in; D-085 6). */
function replaced(file: string, h: Held, stat: fs.Stats | undefined): boolean {
  if (!stat) return h.size > 0;
  if ((h.ino !== 0 && stat.ino !== h.ino) || stat.size < h.size) return true;
  return h.head.length > 0 && digestOf(headOf(file, h.head.length)) !== h.head.digest;
}

/** Open a ledger file (absent = empty). Bad lines are reported through `warn` and skipped, so one
 * bad line never hides the rest. The next `seq` is above every `seq` seen, valid or not. `readOnly`:
 * while it says so, every append is refused with `read-only` before anything is stamped or written (D-085 3);
 * default never, so a host with no read-only opening writes as before. */
export function openLedger(file: string, warn: (m: string) => void = (m) => console.error(m), opts: { readOnly?: () => boolean } = {}): Ledger {
  const first = readHeld(file, warn, false);
  let h: Held = first;
  let readOnly = opts.readOnly ?? (() => false);
  const listeners = new Set<(e: LedgerEvent) => void>();
  const resets = new Set<() => void>();
  let followers = 0;

  /** Take `event` in: indexed, folded, kept, and told to every listener. */
  const add = (event: LedgerEvent) => {
    h.events.push(event);
    indexEvent(h.ix, event);
    applyEvent(h.s, event);
    for (const fn of [...listeners]) {
      try { fn(event); } catch (err) { warn(`ledger: listener failed: ${String(err)}`); }
    }
  };
  /** One line another writer appended, checked as `readLedger` checks a line on open (`readLine`). */
  const takeLine = (line: string) => {
    const read = readLine(h.ix, line);
    if (read.event) return add(read.event);
    if (read.notJSON) return warn('ledger: a line another writer appended is not JSON');
    for (const p of read.problems) warn(`ledger: a line another writer appended: ${p}`);
  };
  /** The file was replaced: read it again from the start and tell every reset listener. */
  const reopen = () => {
    h = readHeld(file, warn, true);
    for (const fn of [...resets]) {
      try { fn(); } catch (err) { warn(`ledger: reset listener failed: ${String(err)}`); }
    }
  };
  const refresh = () => {
    const stat = fs.statSync(file, { throwIfNoEntry: false });
    if (replaced(file, h, stat)) return reopen();
    if (!h.ino && stat) h.ino = stat.ino; // the file was made since it was opened
    const now = stat?.size ?? 0;
    if (now <= h.size) return;
    const fd = fs.openSync(file, 'r');
    const chunk = Buffer.alloc(now - h.size);
    try { fs.readSync(fd, chunk, 0, chunk.length, h.size); } finally { fs.closeSync(fd); }
    const whole = chunk.subarray(0, chunk.lastIndexOf(0x0a) + 1); // a line still being written waits
    if (!whole.length) return;
    if (h.head.length < HEAD_BYTES) {
      const length = Math.min(HEAD_BYTES, h.size + whole.length);
      h.head = { length, digest: digestOf(headOf(file, length)) };
    }
    h.size += whole.length;
    h.torn = false;
    for (const line of whole.toString('utf8').split('\n')) if (line.trim()) takeLine(line);
  };
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    file,
    problems: first.problems,
    state: () => h.s,
    events: () => h.events,
    readOnly: () => readOnly(),
    gate(fn) { readOnly = fn; },
    onAppend(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    onReset(fn) {
      resets.add(fn);
      return () => { resets.delete(fn); };
    },
    refresh,
    follow() {
      // Polled against the size this ledger last read, not `fs.watchFile`: its first look is taken
      // later, so a line written in between was never seen as a change.
      if (followers++ === 0) timer = setInterval(refresh, FOLLOW_MS).unref();
      let on = true;
      return () => {
        if (!on) return;
        on = false;
        if (--followers === 0) clearInterval(timer);
      };
    },
    append(input, caller, opts = {}) {
      // Read-only: refused before anything is read, stamped or written (D-085 3), in the caller's words.
      if (readOnly()) throw problem('read-only', caller.by === 'agent' ? READ_ONLY : READ_ONLY_PERSON);
      refresh();
      const e = stamp(input, caller, h.ix.seq + 1, h.ix);
      const errors = check(input, e, h.ix, h.s, opts.board);
      if (errors.length) {
        throw problem('invalid', serverFoldersWords.theEventDoesNotFit, { errors });
      }
      const event = fromLine(e);
      const line = `${h.torn ? '\n' : ''}${JSON.stringify(e)}\n`;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, line);
      h.size += Buffer.byteLength(line);
      h.ino ||= fs.statSync(file).ino;
      h.torn = false;
      add(event);
      return event;
    },
  };
}
