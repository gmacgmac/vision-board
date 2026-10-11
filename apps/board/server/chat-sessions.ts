// The chat sessions (chat-panel BE_03 rulings 1, 2, 6; api.md 101): the only thing that starts a
// command-line agent. One session per board is in use, the newest; a new one replaces it and stops
// the old one's CLI. The index (chat-index.ts) keeps every session, so after a reload or a restart
// a session is loaded again on first use and its CLI resumes its own transcript. Every CLI process
// is stopped when the server closes. A session may start in the folder with no board; it moves to
// the first board its agent creates (panel-send ruling 2). The board's Send hands the session in use
// on the board the person's answers since it was last told (`round`, ruling 1).
import path from 'node:path';
import { creatorOf } from '../../../packages/actions/src/index.ts';
import type { AgentAdapter, StartOptions } from '../../../packages/agent/src/index.ts';
import { createClaudeAdapter, createKiroAdapter } from '../../../packages/agent/src/index.ts';
import type { Agents } from './agents.ts';
import { CHAT_TOOLS, INSTRUCTIONS_FILE, agentName, chatLabel, joinAndGrant, newIdentity, rekey, vbServer } from './chat-access.ts';
import type { ChatIndex, ChatSession, StoredSession } from './chat-index.ts';
import { openChatIndex, publicSession } from './chat-index.ts';
import { previousSend, roundText } from './chat-round.ts';
import type { LiveSession } from './chat-session.ts';
import { createLiveSession, hasToken, newRunToken } from './chat-session.ts';
import type { Ledger } from './ledger.ts';
import { problem } from './problem.ts';

/** One adapter maker per CLI the server can run. */
export type ChatAdapters = Partial<Record<ChatSession['agent'], () => AgentAdapter>>;

export const DEFAULT_ADAPTERS: ChatAdapters = { claude: () => createClaudeAdapter(), kiro: () => createKiroAdapter() };

export interface ChatOptions {
  ledger: Ledger;
  agents: () => Agents;
  /** This server's own address, such as `http://127.0.0.1:4466`. */
  base: () => string;
  adapters?: ChatAdapters | undefined;
  /** How long an approval waits (tests shorten it). */
  approvalTtlMs?: number | undefined;
  /** Why an agent cannot start on this server (Kiro's agent file not written, N34 ruling 1). */
  blocked?: Partial<Record<ChatSession['agent'], string>> | undefined;
}

/** Where a session is: a board, or `undefined` for the folder (a session on no board yet). */
export type Place = string | undefined;

export interface Chats {
  /** Start a new session on `board` (or in the folder), replacing its current one. */
  start(board: Place, agent: ChatSession['agent'], model?: string): Promise<ChatSession>;
  /** The board's (or the folder's) sessions, newest first. */
  list(board: Place): ChatSession[];
  /** The session in use on the board (or in the folder). */
  current(board: Place): StoredSession | undefined;
  /** Whether a new session is starting there (its current one then takes no message). */
  starting(board: Place): boolean;
  /** The board's Send `send` (its `seq`): hand the session in use on the board the person's answers
   * since it was last told, now or when its turn ends; nothing when the board has no session. */
  round(board: string, send: number): Promise<'sent' | 'queued' | undefined>;
  /** A session, loaded and ready (resumed after a restart); `not-found` when there is none. */
  live(id: string): Promise<LiveSession>;
  /** A session already loaded in this server, if it is. */
  loaded(id: string): LiveSession | undefined;
  /** The loaded session whose run token this is. */
  byToken(token: string): LiveSession | undefined;
  /** Stop every CLI. */
  close(): void;
}

const notFound = (id: string) =>
  problem('not-found', `There is no chat session "${id}" on this server. Call list_chats to see the board's sessions.`);

const reason = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function openChats({ ledger, agents, base, adapters = DEFAULT_ADAPTERS, approvalTtlMs, blocked = {} }: ChatOptions): Chats {
  const dir = path.dirname(ledger.file);
  const cwd = path.dirname(dir);
  let index: ChatIndex | undefined;
  const store = () => (index ??= openChatIndex(dir));
  const entries = () => store().all();
  const sessions = new Map<string, LiveSession>();
  const loading = new Map<string, Promise<LiveSession>>();
  const starts = new Map<string, number>();
  /** Per session, the ledger line its last round covered (in memory: after a restart, the Send before). */
  const told = new Map<string, number>();
  const key = (board: Place) => board ?? '';

  /** What the adapter needs for one session: the vb server with its secret, and the gate. */
  const options = (secret: string, token: string, extra: Partial<StartOptions>): StartOptions => ({
    cwd, ...extra, instructionsFile: INSTRUCTIONS_FILE, allowedTools: CHAT_TOOLS,
    mcpServers: { vb: vbServer(base(), secret, cwd) }, gate: { url: `${base()}/api/run/approvals`, token },
  });

  const keep = (record: StoredSession, adapterSession: Parameters<typeof createLiveSession>[1], token: string, resumed = false) => {
    const live = createLiveSession(record, adapterSession, token, { ttlMs: approvalTtlMs, resumed });
    sessions.set(record.session, live);
    return live;
  };

  async function load(record: StoredSession): Promise<LiveSession> {
    const make = adapters[record.agent];
    if (!make) throw problem('conflict', `${agentName(record.agent)} is not available on this server, so this session cannot run.`);
    const why = blocked[record.agent];
    if (why) throw problem('conflict', `${agentName(record.agent)} could not be started: ${why}`);
    const token = newRunToken();
    try {
      const extra = { sessionId: record.session, ...(record.model && { model: record.model }) };
      const started = await make().start(options(rekey(agents(), record.agentId), token, extra));
      return keep(record, started, token, true);
    } catch (err) {
      throw problem('conflict', `${agentName(record.agent)} could not be started: ${reason(err)}`);
    }
  }

  function live(id: string): Promise<LiveSession> {
    const ready = sessions.get(id);
    if (ready) return Promise.resolve(ready);
    const record = entries().find((e) => e.session === id);
    if (!record) return Promise.reject(notFound(id));
    let pending = loading.get(id);
    if (!pending) {
      pending = load(record).finally(() => loading.delete(id));
      loading.set(id, pending);
    }
    return pending;
  }

  const current = (board: Place) => entries().findLast((e) => e.board === board);

  /** A session on no board moves to the first board its own agent creates (panel-send ruling 2). */
  const offAppend = ledger.onAppend((e) => {
    if (e.type !== 'board' || e.by !== 'agent' || !index) return;
    const waiting = entries().find((x) => x.board === undefined && x.agentId === e.agent);
    if (waiting && creatorOf(ledger.state(), e.board) === e.agent) store().attach(waiting.session, e.board);
  });

  return {
    async start(board, agent, model) {
      const make = adapters[agent];
      if (!make) {
        throw problem('invalid', `${agentName(agent)} is not available on this server.`, {
          errors: [{ pointer: '/agent', detail: `${agent} cannot be started here; use one of: ${Object.keys(adapters).join(', ')}` }],
        });
      }
      const why = blocked[agent];
      if (why) throw problem('invalid', `${agentName(agent)} could not be started.`, { errors: [{ pointer: '/agent', detail: why }] });
      const identity = newIdentity(ledger, agents());
      const token = newRunToken();
      let started;
      const at = key(board);
      starts.set(at, (starts.get(at) ?? 0) + 1);
      try {
        started = await make().start(options(identity.secret, token, model ? { model } : {}));
      } catch (err) {
        throw problem('invalid', `${agentName(agent)} could not be started.`, { errors: [{ pointer: '/agent', detail: reason(err) }] });
      } finally {
        const left = starts.get(at)! - 1;
        if (left > 0) starts.set(at, left); else starts.delete(at);
      }
      const record: StoredSession = {
        session: started.id, ...(board !== undefined && { board }), agent, ...(model && { model }), created: new Date().toISOString(), agentId: identity.agentId,
      };
      joinAndGrant(ledger, agents(), identity, chatLabel(agent, started.id), board);
      const old = current(board);
      if (old) sessions.get(old.session)?.close();
      store().add(record);
      keep(record, started, token);
      return publicSession(record);
    },
    list: (board) => entries().filter((e) => e.board === board).reverse().map(publicSession),
    current,
    starting: (board) => starts.has(key(board)),
    async round(board, send) {
      const record = current(board);
      if (!record || starts.has(key(board))) return undefined;
      const id = record.session;
      return (await live(id)).post(() => {
        const s = ledger.state();
        const since = told.get(id) ?? previousSend(s, board, send);
        told.set(id, s.seq);
        return roundText(s, board, since, record.agentId);
      }) || undefined;
    },
    live,
    loaded: (id) => sessions.get(id),
    byToken: (token) => [...sessions.values()].find((s) => hasToken(s, token)),
    close() {
      offAppend();
      for (const s of sessions.values()) s.close();
    },
  };
}
