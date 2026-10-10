// The chat sessions (chat-panel BE_03 rulings 1, 2, 6; api.md 101): the only thing that starts a
// command-line agent. One session per board is in use, the newest; a new one replaces it and stops
// the old one's CLI. The index (chat-index.ts) keeps every session, so after a reload or a restart
// a session is loaded again on first use and its CLI resumes its own transcript. Every CLI process
// is stopped when the server closes.
import path from 'node:path';
import type { AgentAdapter, StartOptions } from '../../../packages/agent/src/index.ts';
import { createClaudeAdapter, createKiroAdapter } from '../../../packages/agent/src/index.ts';
import type { Agents } from './agents.ts';
import { CHAT_TOOLS, INSTRUCTIONS_FILE, agentName, chatLabel, joinAndGrant, newIdentity, rekey, vbServer } from './chat-access.ts';
import type { ChatIndex, ChatSession, StoredSession } from './chat-index.ts';
import { openChatIndex, publicSession } from './chat-index.ts';
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
}

export interface Chats {
  /** Start a new session on `board`, replacing its current one. */
  start(board: string, agent: ChatSession['agent'], model?: string): Promise<ChatSession>;
  /** The board's sessions, newest first. */
  list(board: string): ChatSession[];
  /** The session in use on the board. */
  current(board: string): StoredSession | undefined;
  /** Whether a new session is starting on the board (its current one then takes no message). */
  starting(board: string): boolean;
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

export function openChats({ ledger, agents, base, adapters = DEFAULT_ADAPTERS, approvalTtlMs }: ChatOptions): Chats {
  const dir = path.dirname(ledger.file);
  const cwd = path.dirname(dir);
  let index: ChatIndex | undefined;
  const store = () => (index ??= openChatIndex(dir));
  const entries = () => store().all();
  const sessions = new Map<string, LiveSession>();
  const loading = new Map<string, Promise<LiveSession>>();
  const starts = new Map<string, number>();

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
    const token = newRunToken();
    try {
      const extra = { sessionId: record.session, ...(record.model && { model: record.model }) };
      const started = await make().start(options(rekey(agents(), record.agentId), token, extra));
      return keep(record, started, token, true);
    } catch (err) {
      throw problem('conflict', `${agentName(record.agent)} could not be started: ${reason(err)}`);
    }
  }

  const current = (board: string) => entries().findLast((e) => e.board === board);

  return {
    async start(board, agent, model) {
      const make = adapters[agent];
      if (!make) {
        throw problem('invalid', `${agentName(agent)} is not available on this server.`, {
          errors: [{ pointer: '/agent', detail: `${agent} cannot be started here; use one of: ${Object.keys(adapters).join(', ')}` }],
        });
      }
      const identity = newIdentity(ledger, agents());
      const token = newRunToken();
      let started;
      starts.set(board, (starts.get(board) ?? 0) + 1);
      try {
        started = await make().start(options(identity.secret, token, model ? { model } : {}));
      } catch (err) {
        throw problem('invalid', `${agentName(agent)} could not be started.`, { errors: [{ pointer: '/agent', detail: reason(err) }] });
      } finally {
        const left = starts.get(board)! - 1;
        if (left > 0) starts.set(board, left); else starts.delete(board);
      }
      const record: StoredSession = {
        session: started.id, board, agent, ...(model && { model }), created: new Date().toISOString(), agentId: identity.agentId,
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
    starting: (board) => starts.has(board),
    live(id) {
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
    },
    loaded: (id) => sessions.get(id),
    byToken: (token) => [...sessions.values()].find((s) => hasToken(s, token)),
    close() {
      for (const s of sessions.values()) s.close();
    },
  };
}
