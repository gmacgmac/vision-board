// The board's engine part (nclite's plugin contract, plugins.md § Where each part runs; docs/principles.md
// § The board is a plugin): everything the board does on the server, with no HTTP, no socket and no
// environment. Its host gives it the board's data folder (`dir`: the standalone server passes
// `<project>/.visionboard`, nclite the bot's `plugins/board/`), and passes the caller with every call
// (the standalone server turns its secrets and cookie into one; nclite takes the bot from its run
// ticket). The ledger and the agents' hashes live in `dir`; the engine never looks for a folder.
import path from 'node:path';
import type { LedgerEvent, OperationId } from '#format';
import { OPERATIONS, ROUTE_PREFIX } from '#format';
import type { BoardRef, CardRef, ChipRefusal, ChipText, NoteRef, Round } from '#actions';
import { eventBoard, resolveChip, turnOf } from '#actions';
import type { Agents } from '../agents.ts';
import { openAgents } from '../agents.ts';
import type { Caller, Ledger } from '../ledger.ts';
import { LEDGER_FILE, openLedger } from '../ledger.ts';
import { ProblemError, problem, serverError } from '../problem.ts';
import type { EngineReply, Op } from './operations.ts';
import { checkCaller, matchRoute, readParams, withDefaults } from './operations.ts';
import { READS } from './reads.ts';
import type { EngineTool } from './tools.ts';
import { makeTools } from './tools.ts';
import { WRITES } from './writes.ts';

/** One request, as the host has it: the path relative to the board's prefix (`boards/plans`), the
 * query, the body (its value, or a reader the engine calls with the operation's byte limit), the
 * caller the host vouches for, and a signal that ends a held read when the caller goes away. */
export interface EngineRequest {
  method: string;
  path: string;
  query?: URLSearchParams;
  body?: unknown;
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
  /** Told after the person's Send is stored (the standalone server hands its chat session the answers). */
  onSend?: ((board: string, seq: number) => void) | undefined;
  /** Where the ledger's warnings go (a bad line); default stderr. */
  warn?: ((message: string) => void) | undefined;
}

export interface Engine {
  readonly dir: string;
  /** Answer one request; null when no operation of the engine's has its path. */
  route(req: EngineRequest): Promise<EngineReply | null>;
  /** What a chip says now, or why it can't be sent (`resolveChip`). */
  resolve(kind: string, ref: unknown): ChipText | ChipRefusal;
  /** The person's answers on `board` since ledger line `since`, as `agent` may read them: the block a
   * host adds to the bot's next message (`turnOf`); none when nothing was answered. */
  turn(q: { board: string; since: number; agent?: string | undefined }): Round | ChipRefusal | undefined;
  /** One tool per agent operation the engine serves, by the tool table's names. */
  readonly tools: Readonly<Record<string, EngineTool>>;
  /** Every change to the ledger, from anyone (this engine, or another writer on `dir`). Returns a stop. */
  watch(onChange: (change: EngineChange) => void): () => void;
  /** The standalone host's, for the parts it runs beside the engine (chat sessions, the app host). */
  readonly ledger: Ledger;
  agents(): Agents;
}

const OPS: Partial<Record<OperationId, Op>> = { ...READS, ...WRITES };

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

export function createEngine({ dir, ledger: given, name = () => dir, onSend = () => {}, warn }: EngineOptions): Engine {
  const ledger = given ?? openLedger(path.join(dir, LEDGER_FILE), warn);
  let agents: Agents | undefined;
  const getAgents = () => (agents ??= openAgents(dir));

  /** Run operation `id`: the caller checked, then its handler; a problem is the reply. */
  async function run(id: OperationId, input: { params: Record<string, unknown>; body: unknown; caller: Caller | undefined; signal: AbortSignal | undefined }) {
    try {
      checkCaller(id, input.caller);
      ledger.refresh();
      const read = input.body;
      return await OPS[id]!({
        params: withDefaults(id, input.params), caller: input.caller, signal: input.signal, ledger, agents: getAgents, name, onSend,
        body: typeof read === 'function' ? (limit) => (read as (limit?: number) => Promise<unknown>)(limit) : async () => read,
      });
    } catch (err) { return toReply(err); }
  }

  return {
    dir,
    ledger,
    agents: getAgents,
    async route({ method, path: rel, query = new URLSearchParams(), body, caller, signal }) {
      const match = matchRoute(method, `${ROUTE_PREFIX}${rel.replace(/^\/+/, '')}`);
      if (match === null) return null;
      if ('allow' in match) {
        const allow = match.allow.filter((m) => (Object.keys(OPS) as OperationId[]).some((id) => OPERATIONS[id].method === m));
        return allow.length ? toReply(problem('method-not-allowed', `This path answers ${allow.join(', ')} only.`, { headers: { Allow: allow.join(', ') } })) : null;
      }
      if (!servesOperation(match.id)) return null;
      let params: Record<string, unknown>;
      try { params = readParams(match.id, match.raw, query); } catch (err) { return toReply(err); }
      return run(match.id, { params, body, caller, signal });
    },
    resolve(kind, ref) {
      ledger.refresh();
      const s = ledger.state();
      if (typeof ref !== 'object' || ref === null) return { refused: 'gone', reason: 'The chip names nothing on the board.' };
      if (kind === 'card') return resolveChip(s, 'card', ref as CardRef);
      if (kind === 'note') return resolveChip(s, 'note', ref as NoteRef);
      if (kind === 'board') return resolveChip(s, 'board', ref as BoardRef);
      return { refused: 'gone', reason: `The board has no ${kind}.` };
    },
    turn({ board, since, agent }) {
      ledger.refresh();
      return turnOf(ledger.state(), board, since, agent);
    },
    tools: makeTools(servesOperation, run),
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
