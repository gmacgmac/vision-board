// The board's engine part (nclite's plugin contract, plugins.md § Where each part runs; docs/principles.md
// § The board is a plugin): everything the board does on the server, with no HTTP, no socket and no
// environment. Its host gives it the board's data folder (`dir`: the standalone server passes
// `<project>/.visionboard`, nclite the bot's `plugins/board/`), and passes the caller with every call
// (the standalone server turns its secrets and cookie into one; nclite takes the bot from its run
// ticket). The ledger and the agents' hashes live in `dir`; the engine never looks for a folder. With `readOnly`
// (D-085, the standalone host's read-only opening), every operation that writes answers `read-only` before anything
// is read or written, and the reads say `readOnly: true`.
import path from 'node:path';
import type { FlagOverrides, LedgerEvent, OperationId } from '#format';
import { IMAGES_DIR, LEDGER_FILE, OPERATIONS, ROUTE_PREFIX } from '#format';
import type { AnswersRef, AnswersText, BoardRef, CardRef, ChipRefusal, ChipText, NoteRef, SelectionRef } from '#actions';
import { eventBoard, resolveChip } from '#actions';
import type { Agents } from '../agents.ts';
import { openAgents } from '../agents.ts';
import { imageReply } from '../images.ts';
import type { Caller, Ledger } from '../ledger.ts';
import { openLedger } from '../ledger.ts';
import { ProblemError, problem, serverError } from '../problem.ts';
import { READ_ONLY, READ_ONLY_PERSON } from '#actions';
import type { EngineReply, Op, SendHook } from './operations.ts';
import { checkCaller, matchRoute, readParams, withDefaults } from './operations.ts';
import { READS } from './reads.ts';
import type { EngineTools } from './tools.ts';
import { makeTools } from './tools.ts';
import { WRITES } from './writes.ts';
import * as httpWords from '../words/http.ts';

/** One request, as the host has it: the path relative to the board's prefix (`boards/plans`), the
 * query, and the body (its value, or a reader the engine calls with the operation's byte limit). */
export interface EngineRequest {
  method: string;
  path: string;
  query?: URLSearchParams;
  body?: unknown;
}

/** Who a call is from and how long it lasts: the caller the host vouches for, and a signal that ends a
 * held read when the caller goes away. `route` and `tools.call` take the same. */
export interface EngineContext {
  caller?: Caller | undefined;
  signal?: AbortSignal | undefined;
}

/** A change to the board's files, from anyone: the board it is on (none for a line on no board,
 * such as an agent's `join`) and the ledger's head after it. */
export interface EngineChange { board?: string; head: number }

export interface EngineOptions {
  /** The board's data folder: the only place the engine reads or writes. */
  dir: string;
  /** The ledger in `dir`, when the host has already opened it (the standalone server, under its lock). */
  ledger?: Ledger | undefined;
  /** The board's folder as the person reads it (`list_boards`, `join` answer `project`); default `dir`. */
  name?: (() => string) | undefined;
  /** The ledger's name, when the host keeps several in one folder (the standalone server's ledger folders,
   *  D-084): `list_boards` and `join` answer it as `ledger`. Default none, and no `ledger` in the answers. */
  ledgerName?: string | undefined;
  /** Given the person's Send to record (`SendHook`): the standalone server records it once its chat session has the
   *  answers. Default: recorded at once. */
  onSend?: SendHook | undefined;
  /** Where the ledger's warnings go (a bad line); default stderr. */
  warn?: ((message: string) => void) | undefined;
  /** The flags the engine reads itself (svgImages, for `image`; botToolRules, for its tools, reads and keys); default,
   * each flag's default. */
  flags?: FlagOverrides | undefined;
  /** True while the ledger is open read-only (D-085): asked on every call, so a host can flip it (Edit, Stop editing).
   *  Every write answers `read-only` and writes nothing, in `dir` or its ledger (`Ledger.gate`); reads carry
   *  `readOnly: true`. Default never: a host with no read-only opening writes as before. */
  readOnly?: (() => boolean) | undefined;
}

export interface Engine {
  readonly dir: string;
  /** Answer one request; null when no operation of the engine's has its path. */
  route(req: EngineRequest, ctx?: EngineContext): Promise<EngineReply | null>;
  /** Answers the board's image route, what `BoardHost.imageRoute` points at (`images.md`): `path` is the
   *  route's text after the prefix, as the request wrote it. A GET or HEAD of a picture in `dir`'s images
   *  folder and only there, each checked as the standalone route checks it; `body` is its bytes, or null. */
  image(req: { method: string; path: string; ifNoneMatch?: string | undefined }): EngineReply;
  /** What a chip says now, or why it can't be sent (`resolveChip`). A host calls it for every chip as
   * its message goes, the answers chip included: its text is '' when nothing was answered since, and
   * nothing need go for it. */
  resolve(kind: 'answers', ref: AnswersRef): AnswersText | ChipRefusal;
  resolve(kind: string, ref: unknown): ChipText | ChipRefusal;
  /** One tool per agent operation the engine serves, by the tool table's names, in MCP's shapes. */
  readonly tools: EngineTools;
  /** Every change to the ledger, from anyone (this engine, or another writer on `dir`). Returns a stop. */
  watch(onChange: (change: EngineChange) => void): () => void;
  /** The standalone host's, for the parts it runs beside the engine (chat sessions, the app host). */
  readonly ledger: Ledger;
  agents(): Agents;
}

const OPS: Partial<Record<OperationId, Op>> = { ...READS, ...WRITES };

/** The caller a host passed, as the operations may trust it: an agent with no id is no caller, so a host's lost id
 * refuses as no caller does and never writes a line that names nobody. */
const namedCaller = (caller: Caller | undefined): Caller | undefined =>
  (caller?.by === 'agent' && (typeof caller.agent !== 'string' || !caller.agent) ? undefined : caller);

/** A host's body reader: what it throws, but a problem of its own, is a request that can't be read. */
async function readBody(read: (limit?: number) => Promise<unknown>, limit?: number): Promise<unknown> {
  try { return await read(limit); } catch (err) {
    if (err instanceof ProblemError) throw err;
    throw problem('bad-request', httpWords.theBodyCouldNotBeRead);
  }
}

/** An operation the engine serves. */
export type EngineOperation = keyof typeof READS | keyof typeof WRITES;

/** The operations the engine serves, in the route table's order. */
export const ENGINE_OPERATIONS = (Object.keys(OPERATIONS) as OperationId[]).filter((id): id is EngineOperation => id in OPS);

/** True when the engine serves operation `id`. */
export const servesOperation = (id: string): id is EngineOperation => id in OPS;

const toReply = (err: unknown): EngineReply => {
  const p = err instanceof ProblemError ? err : serverError(err);
  return { status: p.status, body: p.body, headers: { ...p.headers, 'Content-Type': 'application/problem+json; charset=utf-8' } };
};

export function createEngine({ dir, ledger: given, name = () => dir, ledgerName, onSend = (_, record) => record(), warn, flags = {}, readOnly }: EngineOptions): Engine {
  const ledger = given ?? openLedger(path.join(dir, LEDGER_FILE), warn);
  if (readOnly) ledger.gate(readOnly);
  const closed = readOnly ?? (() => false);
  let agents: Agents | undefined;
  const getAgents = () => (agents ??= openAgents(dir, closed));

  /** Run operation `id`: the caller checked, then its handler; a problem is the reply. */
  async function run(id: OperationId, input: { params: Record<string, unknown>; body: unknown; caller: Caller | undefined; signal: AbortSignal | undefined }) {
    try {
      const caller = namedCaller(input.caller);
      checkCaller(id, caller);
      // Read-only: a write is refused before its body is read (D-085 3, 4); `join` too, so no agents file is written.
      if (OPERATIONS[id].method !== 'GET' && closed()) throw problem('read-only', caller?.by === 'person' ? READ_ONLY_PERSON : READ_ONLY);
      ledger.refresh();
      const read = input.body;
      return await OPS[id]!({
        params: withDefaults(id, input.params), caller, signal: input.signal, ledger, agents: getAgents, name, ledgerName, onSend, flags, readOnly: closed(),
        body: typeof read === 'function' ? (limit) => readBody(read as (limit?: number) => Promise<unknown>, limit) : async () => read,
      });
    } catch (err) { return toReply(err); }
  }

  return {
    dir,
    ledger,
    agents: getAgents,
    async route({ method, path: rel, query = new URLSearchParams(), body }, { caller, signal } = {}) {
      const match = matchRoute(method, `${ROUTE_PREFIX}${rel.replace(/^\/+/, '')}`);
      if (match === null) return null;
      if ('allow' in match) {
        const allow = match.allow.filter((m) => (Object.keys(OPS) as OperationId[]).some((id) => OPERATIONS[id].method === m));
        return allow.length ? toReply(problem('method-not-allowed', httpWords.thisPathAnswersOnly(allow.join(', ')), { headers: { Allow: allow.join(', ') } })) : null;
      }
      if (!servesOperation(match.id)) return null;
      let params: Record<string, unknown>;
      try { params = readParams(match.id, match.raw, query); } catch (err) { return toReply(err); }
      return run(match.id, { params, body, caller, signal });
    },
    image({ method, path: raw, ifNoneMatch }) {
      try { return imageReply({ method, ifNoneMatch }, raw, path.join(dir, IMAGES_DIR), flags); } catch (err) { return toReply(err); }
    },
    resolve: ((kind: string, ref: unknown): ChipText | ChipRefusal => {
      ledger.refresh();
      const s = ledger.state();
      if (typeof ref !== 'object' || ref === null) return { refused: 'gone', reason: httpWords.theChipNamesNothingOn };
      if (kind === 'card') return resolveChip(s, 'card', ref as CardRef);
      if (kind === 'note') return resolveChip(s, 'note', ref as NoteRef);
      if (kind === 'board') return resolveChip(s, 'board', ref as BoardRef);
      if (kind === 'selection') return Array.isArray((ref as SelectionRef).cards) ? resolveChip(s, 'selection', ref as SelectionRef) : { refused: 'gone', reason: httpWords.theChipNamesNothingOn };
      if (kind === 'answers') return resolveChip(s, 'answers', ref as AnswersRef);
      return { refused: 'gone', reason: httpWords.theBoardHasNo(kind) };
    }) as Engine['resolve'],
    tools: makeTools(servesOperation, run, flags),
    watch(onChange) {
      const tell = (e: LedgerEvent) => {
        const board = eventBoard(ledger.state(), e);
        onChange({ ...(board !== undefined && { board }), head: e.seq });
      };
      const off = ledger.onAppend(tell);
      const unfollow = ledger.follow();
      return () => { off(); unfollow(); };
    },
  };
}
