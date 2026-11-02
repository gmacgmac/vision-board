// The chat sessions (chat-panel BE_03 rulings 1, 2, 6; api.md 101): the only thing that starts a
// command-line agent. One session per board is in use, the newest; a new one replaces it and stops
// the old one's CLI. The index (chat-index.ts) keeps every session, so after a reload or a restart
// a session is loaded again on first use and its CLI resumes its own transcript. Every CLI process
// is stopped when the server closes. A session may start in the folder with no board; it moves to
// the first board its agent creates (panel-send ruling 2). A board session's agent is handed the
// person's answers since it was last told with every message (`tell`, chat-board-context ruling 2),
// and the board's Send hands them on their own (`send`, panel-send ruling 1), recorded once they went (point 383): one builder,
// chat-prompt.ts `promptFor`. The answers and the cards are read as any host reads a chip, through the
// engine's `resolve` (`ChatOptions.resolve`, D-074 rule 6). A message waits while a turn runs (ruling 5; words alone too, point
// 328), joined with any already waiting. Each session's approvals are decided by the access rules of
// the board's folder (D-066), with the folder's kept yeses (`chat-permissions.ts`); `approvalHold` and
// `strictAccess` (the `agentAccessRules` flag off) come from the server's flags.
import fs from 'node:fs';
import path from 'node:path';
import type { AnswersText } from '#actions';
import { creatorOf, sendHead as headFor } from '#actions';
import type { LedgerEvent } from '#format';
import type { AgentAdapter, StartOptions } from '#agent';
import { createClaudeAdapter, createKiroAdapter } from '#agent';
import type { Agents } from './agents.ts';
import { checked, withSaid } from './chat-files.ts';
import { CHAT_TOOLS, INSTRUCTIONS_FILE, MCP_NAME, agentName, boardMcpServer, chatLabel, joinAndGrant, newIdentity, rekey } from './chat-access.ts';
import type { ChatIndex, ChatSession, StoredSession } from './chat-index.ts';
import { openChatIndex, publicSession } from './chat-index.ts';
import type { ChatMessage, ResolveChip } from './chat-prompt.ts';
import { promptFor, wordsOf } from './chat-prompt.ts';
import { previousSend } from './chat-round.ts';
import type { Permissions } from './chat-permissions.ts';
import { openPermissions } from './chat-permissions.ts';
import type { ChatEvent, LiveSession } from './chat-session.ts';
import { createLiveSession, hasToken, QUEUED, QUEUED_WORDS } from './chat-session.ts';
import { newToken } from './secrets.ts';
import type { SendHook } from './engine/operations.ts';
import type { Ledger } from './ledger.ts';
import { problem } from './problem.ts';
import { isLocked } from './visibility.ts';
import * as serverChatWords from './words/server-chat.ts';

/** One adapter maker per CLI the server can run. */
export type ChatAdapters = Partial<Record<ChatSession['agent'], () => AgentAdapter>>;

export const DEFAULT_ADAPTERS: ChatAdapters = { claude: () => createClaudeAdapter(), kiro: () => createKiroAdapter() };

export interface ChatOptions {
  ledger: Ledger;
  /** What a chip says now: the engine's `resolve`. */
  resolve: ResolveChip;
  agents: () => Agents;
  /** This server's own address, such as `http://127.0.0.1:4466`. */
  base: () => string;
  adapters?: ChatAdapters | undefined;
  /** How long an approval waits (tests shorten it). */
  approvalTtlMs?: number | undefined;
  /** Why an agent cannot start on this server (Kiro's agent file not written, N34 ruling 1). */
  blocked?: Partial<Record<ChatSession['agent'], string>> | undefined;
  /** The `approvalHold` flag: a question waits for the person, and the turn clock with it. */
  approvalHold?: boolean | undefined;
  /** The `agentAccessRules` flag off: nothing goes ahead unasked, nothing is kept for the folder. */
  strictAccess?: boolean | undefined;
  /** The `chatAttachments` flag: the person may attach files to a message (D-068). */
  attachments?: boolean | undefined;
  /** The `readAttachment` flag: the agent may read attached files with `read_attachment` (D-071). */
  readAttachment?: boolean | undefined;
  /** The `sendCountsWhatWent` flag: a message's Send records `head`, the line its answers were read through (point 377). */
  sendHead?: boolean | undefined;
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
  /** The board's Send (the engine's `onSend`): hand the session in use on the board the person's answers since it was
   * last told and `record` the Send through what they were read at, in one step; while its turn runs, the press is
   * recorded acknowledging nothing new, and the answers go, and are recorded, when it ends. A session that can't be
   * loaded is a `conflict` that says why (point 386): nothing is recorded, so Send stays lit. Recorded at once, as before, when the board has
   * no session or nothing new for its agent, and with the `sendCountsWhatWent` flag off (then handed over after). */
  send: SendHook;
  /** The person's message `msg` to `live`, on its board: the words, the chips and the answers since
   * its agent was last told, as one message, recording the board's Send when it goes. Sent now, or,
   * while a turn runs, held with any message already waiting and sent when the turn ends. In the
   * folder (a session on no board), the words alone, the same way. The `message_in`, the wait's
   * system line, or undefined when there is nothing to send. */
  tell(live: LiveSession, msg: ChatMessage): ChatEvent | undefined;
  /** The yeses kept for this folder ("Allow for this folder"). */
  readonly permissions: Permissions;
  /** Whether the person may attach files to a message (the `chatAttachments` flag). */
  readonly attachments: boolean;
  /** Whether `read_attachment` answers (the `readAttachment` flag). */
  readonly readAttachment: boolean;
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
  problem('not-found', serverChatWords.thereIsNoChatSession(id));

const reason = (err: unknown) => (err instanceof Error ? err.message : String(err));
const notHandedOver = (err: unknown): undefined => { console.error(`chat: the Send's answers were not handed over: ${reason(err)}`); };

/** A message waiting for a turn to end: the person's words and chips, the Send it covers from, and the
 * board's Send it records when it goes, given the line its answers were read through (none: recorded already). */
interface Held { msg: ChatMessage; before: number; record?: ((head: number | undefined) => unknown) | undefined }

const union = (a: number[] = [], b: number[] = []) => [...new Set([...a, ...b])];

/** A message joined to the one already waiting: both messages' words, every chip, the earlier Send. */
function joined(was: Held | undefined, next: Held): Held {
  if (!was) return next;
  const text = [wordsOf(was.msg), wordsOf(next.msg)].filter(Boolean).join('\n\n');
  const [notes, cards] = [union(was.msg.notes, next.msg.notes), union(was.msg.cards, next.msg.cards)];
  const files = [...new Map([...(was.msg.files ?? []), ...(next.msg.files ?? [])].map((f) => [f.path, f])).values()];
  return {
    msg: { ...(text && { text }), ...(notes.length > 0 && { notes }), ...(cards.length > 0 && { cards }), ...(files.length > 0 && { files }) },
    before: Math.min(was.before, next.before), record: next.record ?? was.record,
  };
}

export function openChats(o: ChatOptions): Chats {
  const { ledger, resolve, agents, base, adapters = DEFAULT_ADAPTERS, approvalTtlMs, blocked = {}, approvalHold = false, strictAccess = false, attachments = false, readAttachment = false, sendHead = false } = o;
  const dir = path.dirname(ledger.file);
  const cwd = path.dirname(dir);
  let kept: Permissions | undefined;
  const permissions = () => (kept ??= openPermissions(dir, (() => { try { return fs.realpathSync(cwd); } catch { return cwd; } })()));
  let index: ChatIndex | undefined;
  const store = () => (index ??= openChatIndex(dir));
  const entries = () => store().all();
  const sessions = new Map<string, LiveSession>();
  const loading = new Map<string, Promise<LiveSession>>();
  const starts = new Map<string, number>();
  /** Per session, the ledger line its last round covered (in memory: after a restart, the Send before). */
  const told = new Map<string, number>();
  /** Per session, the message waiting for its turn to end (`joined`). */
  const waiting = new Map<string, Held>();
  const key = (board: Place) => board ?? '';

  /** What the adapter needs for one session: the board's MCP server with its secret, and the gate. */
  const options = (secret: string, token: string, extra: Partial<StartOptions>): StartOptions => ({
    cwd, ...extra, instructionsFile: INSTRUCTIONS_FILE, allowedTools: CHAT_TOOLS, approvalHold, strictAccess,
    mcpServers: { [MCP_NAME]: boardMcpServer(base(), secret, cwd) }, gate: { url: `${base()}/api/run/approvals`, token },
  });

  const keep = (record: StoredSession, adapterSession: Parameters<typeof createLiveSession>[1], token: string, resumed = false) => {
    const access = { folder: cwd, strict: strictAccess, ...(!strictAccess && { kept: permissions() }) };
    const live = createLiveSession(record, adapterSession, token, { access, ttlMs: approvalTtlMs, hold: approvalHold, resumed });
    sessions.set(record.session, live);
    return live;
  };

  async function load(record: StoredSession): Promise<LiveSession> {
    const make = adapters[record.agent];
    if (!make) throw problem('conflict', serverChatWords.isNotAvailableOnThis(agentName(record.agent)));
    const why = blocked[record.agent];
    if (why) throw problem('conflict', serverChatWords.couldNotBeStarted(agentName(record.agent), why));
    const token = newToken();
    try {
      const extra = { sessionId: record.session, ...(record.model && { model: record.model }) };
      const started = await make().start(options(rekey(agents(), record.agentId), token, extra));
      return keep(record, started, token, true);
    } catch (err) {
      throw problem('conflict', serverChatWords.couldNotBeStarted(agentName(record.agent), reason(err)));
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

  /** The answers on `board` the session's agent has not been told, as its answers chip says them. None
   * while the board is locked: it takes no Send, so they wait for the unlock (N40 ruling 7, api.md 139). */
  function unsaid(live: LiveSession, board: string, before: number): AnswersText | undefined {
    const since = told.get(live.record.session) ?? previousSend(ledger.state(), board, before);
    const said = resolve('answers', { board, since, agent: live.record.agentId });
    return 'refused' in said || !said.text ? undefined : said;
  }

  /** Hand `live`'s agent `held` on `board`: built when it goes, the Send recorded then if asked. */
  function deliver(live: LiveSession, board: string, held: Held): ChatEvent | undefined {
    const id = live.record.session;
    if (live.busy) waiting.set(id, held);
    return live.post(() => {
      waiting.delete(id);
      const round = unsaid(live, board, held.before);
      const s = ledger.state();
      const { msg, said } = checked(cwd, held.msg);
      const built = promptFor(s, resolve, board, msg, round);
      const files = msg.files;
      const empty = !round && !wordsOf(msg) && !built.chips.length && !files;
      if (empty && !said) return undefined;
      // On a locked board the words and chips go alone: no round (unsaid), and no Send to record. The round was
      // read just now, through `s.seq`, and the Send is recorded in the same step, so it says so (`head`); a record
      // refused hands over nothing.
      if (!isLocked(s, board)) {
        held.record?.(sendHead ? s.seq : undefined);
        told.set(id, s.seq);
      }
      return { prompt: withSaid(built.prompt, said?.agent), message: { kind: 'message_in', text: withSaid(built.text, said?.person, empty), ...(built.chips.length > 0 && { chips: built.chips }), ...(files && { files }) } };
    }, wordsOf(held.msg) ? QUEUED_WORDS : QUEUED);
  }

  /** With the `sendCountsWhatWent` flag off, the Send already recorded (`send`): hand its answers over after, as before. */
  async function handOver(stored: StoredSession, board: string, send: number): Promise<void> {
    const session = await live(stored.session);
    if (session.busy || unsaid(session, board, send)) deliver(session, board, joined(waiting.get(stored.session), { msg: {}, before: send }));
  }

  /** The words for a session in the folder (no board, so nothing else rides with them): now, or when the turn ends. */
  function inFolder(live: LiveSession, held: Held): ChatEvent | undefined {
    const id = live.record.session;
    if (live.busy) waiting.set(id, held);
    return live.post(() => {
      waiting.delete(id);
      const { msg, said } = checked(cwd, held.msg);
      const built = promptFor(ledger.state(), resolve, undefined, msg);
      return { prompt: withSaid(built.prompt, said?.agent), message: { kind: 'message_in', text: withSaid(built.text, said?.person, !wordsOf(msg) && !msg.files), ...(msg.files && { files: msg.files }) } };
    }, QUEUED_WORDS);
  }

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
        throw problem('invalid', serverChatWords.isNotAvailableOnThisServer(agentName(agent)), {
          errors: [{ pointer: '/agent', detail: serverChatWords.cannotBeStartedHereUse(agent, Object.keys(adapters).join(', ')) }],
        });
      }
      const why = blocked[agent];
      if (why) throw problem('invalid', serverChatWords.couldNotBeStarted2(agentName(agent)), { errors: [{ pointer: '/agent', detail: why }] });
      const identity = newIdentity(ledger, agents());
      const token = newToken();
      let started;
      const at = key(board);
      starts.set(at, (starts.get(at) ?? 0) + 1);
      try {
        started = await make().start(options(identity.secret, token, model ? { model } : {}));
      } catch (err) {
        throw problem('invalid', serverChatWords.couldNotBeStarted2(agentName(agent)), { errors: [{ pointer: '/agent', detail: reason(err) }] });
      } finally {
        const left = starts.get(at)! - 1;
        if (left > 0) starts.set(at, left); else starts.delete(at);
      }
      const record: StoredSession = {
        session: started.id, ...(board !== undefined && { board }), agent, ...(model && { model }), created: new Date().toISOString(), agentId: identity.agentId,
      };
      try {
        joinAndGrant(ledger, agents(), identity, chatLabel(agent, cwd), board);
      } catch (err) {
        started.close?.(); // the board was locked or archived while the CLI started: none is left running
        throw err;
      }
      const old = current(board);
      if (old) { sessions.get(old.session)?.close(); waiting.delete(old.session); }
      store().add(record);
      keep(record, started, token);
      return publicSession(record);
    },
    list: (board) => entries().filter((e) => e.board === board).reverse().map(publicSession),
    current,
    starting: (board) => starts.has(key(board)),
    async send(board, record) {
      const stored = current(board);
      if (!sendHead) {
        const line = record();
        if (stored && !starts.has(key(board))) void handOver(stored, board, line.seq).catch(notHandedOver);
        return line;
      }
      if (!stored || starts.has(key(board))) return record();
      const pressed = () => record(headFor(ledger.state(), board, null).head);
      const session = await live(stored.session).catch((err) => { throw problem('conflict', serverChatWords.theChatCouldNotBeReached(reason(err))); });
      if (!unsaid(session, board, Infinity)) return record();
      let line: LedgerEvent | undefined = session.busy ? pressed() : undefined;
      const now = (head: number | undefined) => (line = record(head));
      deliver(session, board, joined(waiting.get(stored.session), { msg: {}, before: Infinity, record: line ? record : now }));
      return line ?? pressed();
    },
    tell(session, msg) {
      const { board, session: id } = session.record;
      const was = session.busy ? waiting.get(id) : undefined;
      if (board === undefined) return wordsOf(msg) || msg.files ? inFolder(session, joined(was, { msg, before: Infinity })) : undefined;
      const attached = Boolean(msg.notes?.length || msg.cards?.length || msg.files) || unsaid(session, board, Infinity) !== undefined;
      if (!attached && !wordsOf(msg)) return undefined;
      return deliver(session, board, joined(was, { msg, before: Infinity, record: (head) => ledger.append({ type: 'act', action: 'send', board, ...(head !== undefined && { head }) }, { by: 'person' }, { board }) }));
    },
    get permissions() { return permissions(); },
    attachments,
    readAttachment,
    live,
    loaded: (id) => sessions.get(id),
    byToken: (token) => [...sessions.values()].find((s) => hasToken(s, token)),
    close() {
      offAppend();
      for (const s of sessions.values()) s.close();
    },
  };
}
