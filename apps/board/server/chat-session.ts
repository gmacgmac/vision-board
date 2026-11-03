// One running chat session (chat-panel BE_03 ruling 1, api.md 99-101): the adapter's session, the
// events it has made since this server started (stamped here with `at`, `session` and `seq` from
// 1; a session loaded again after a restart starts with one line saying so), who is watching, the
// turn in progress, its approvals (decided by the access rules of the board's folder first, `access`;
// with `hold`, waiting without a limit while the agent's turn clock stops) and its run token. One turn at a time; the adapter's updates are
// forwarded as chat events (`toChatEvent`). A message posted while a turn runs (the board's Send,
// panel-send ruling 1; the person's message with the board's answers, chat-board-context ruling 5)
// waits, one at most, and goes when the turn ends, its text made then. The CLI's own transcript is
// the record, so nothing here is written to disk.
import type { AgentSession, ChatEventDraft } from '#agent';
import { toChatEvent } from '#agent';
import type { ApprovalDraft, ApprovalOptions, Approvals } from './chat-approvals.ts';
import { createApprovals } from './chat-approvals.ts';
import type { AttachedFile } from './chat-files.ts';
import type { StoredSession } from './chat-index.ts';
import type { Chip } from './chat-prompt.ts';
import { sameText } from './secrets.ts';
import * as serverChatWords from './words/server-chat.ts';

export type MessageIn = { kind: 'message_in'; text: string; chips?: Chip[]; files?: AttachedFile[] };
/** A message as it goes: the agent's prompt and the person's `message_in`. */
export interface Built { prompt: string; message: MessageIn }
export type Draft = ChatEventDraft | ApprovalDraft | MessageIn;
/** A chat event as the stream and the routes send it (`chat-event.schema.json`). */
export type ChatEvent = Draft & { at: string; session: string; seq: number };

export interface LiveSession {
  readonly record: StoredSession;
  /** The run token the session's gate shows (`ask_approval`). */
  readonly token: string;
  /** True while a turn runs. */
  readonly busy: boolean;
  readonly approvals: Approvals<ChatEvent>;
  /** The `seq` of the latest event, 0 before any. */
  last(): number;
  /** Every event after `seq`, oldest first. */
  after(seq: number): ChatEvent[];
  /** Called with each new event. Returns an unsubscribe. */
  subscribe(fn: (e: ChatEvent) => void): () => void;
  /** Record the person's message and run the turn in the background: the `message_in` event. */
  send(prompt: string, message: MessageIn): ChatEvent;
  /** A message built when it goes (the board's answers with the person's words, if any): built and
   * sent now when no turn runs, else held until the turn ends (the system line `line` says so,
   * once) and built then; posting again while one waits replaces it. Answers the `message_in`
   * sent now or the system line of the wait; undefined once the session is closed, or when the
   * message built now is empty. A build that throws now throws to the caller. */
  post(build: () => Built | undefined, line?: string): ChatEvent | undefined;
  /** Stop the running turn, releasing its approvals; false when nothing was running. */
  stop(): boolean;
  /** Stop for good: on a new session for the board, and when the server stops. */
  close(): void;
}

/** The first line of a session loaded again after a restart: its earlier events were in memory only. */
export const RESTARTED = serverChatWords.earlierMessagesArenTShown;
/** The line when the board's Send waits for the turn to end. */
export const QUEUED = serverChatWords.yourAnswersGoToThe;
/** The line when the person's message with the board's answers waits for the turn to end. */
export const QUEUED_WORDS = serverChatWords.yourMessageGoesToThe;

/** Whether `given` is this session's token, compared in constant time. */
export const hasToken = (live: LiveSession, given: string): boolean => sameText(live.token, given);

const reason = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** How a live session's approvals are decided: the board's folder, the flag, the folder's kept yeses. */
export type SessionAccess = Pick<ApprovalOptions, 'folder' | 'strict' | 'kept' | 'reader' | 'ledger'>;

export function createLiveSession(
  record: StoredSession, agent: AgentSession, token: string,
  opts: { access: SessionAccess; ttlMs?: number | undefined; hold?: boolean | undefined; resumed?: boolean; warn?: (m: string) => void },
): LiveSession {
  const warn = opts.warn ?? ((m: string) => console.error(m));
  const events: ChatEvent[] = [];
  const listeners = new Set<(e: ChatEvent) => void>();
  let busy = false;
  let closed = false;
  let held: (() => Built | undefined) | undefined;
  let waitLine: ChatEvent | undefined;

  function emit(draft: Draft): ChatEvent {
    const event = { at: new Date().toISOString(), session: record.session, seq: events.length + 1, ...draft } as ChatEvent;
    events.push(event);
    for (const fn of [...listeners]) {
      try { fn(event); } catch (err) { warn(`chat: listener failed: ${reason(err)}`); }
    }
    return event;
  }

  // approvalHold: a question waits for the person, with no limit, and the agent's turn clock stops meanwhile.
  const approvals = opts.hold
    ? createApprovals<ChatEvent>(emit, { ...opts.access, ttlMs: null, onWait: (waiting) => agent.hold?.(waiting) })
    : createApprovals<ChatEvent>(emit, { ...opts.access, ttlMs: opts.ttlMs });
  if (opts.resumed) emit({ kind: 'system', text: RESTARTED });

  async function run(prompt: string): Promise<void> {
    try {
      for await (const update of agent.prompt(prompt)) emit(toChatEvent(update));
    } catch (err) {
      emit({ kind: 'system', text: serverChatWords.theAgentCouldNotRun(reason(err)), turn: 'error' });
    } finally {
      approvals.release();
      busy = false;
      const next = held;
      held = undefined;
      waitLine = undefined;
      if (next && !closed) postHeld(next);
    }
  }

  function start(prompt: string, message: MessageIn): ChatEvent {
    busy = true;
    const event = emit(message);
    void run(prompt);
    return event;
  }

  const postNow = (build: () => Built | undefined): ChatEvent | undefined => {
    const b = build();
    return b && start(b.prompt, b.message);
  };

  function postHeld(build: () => Built | undefined): void {
    try {
      postNow(build);
    } catch (err) {
      emit({ kind: 'system', text: serverChatWords.theBoardSAnswersCould(reason(err)) });
    }
  }

  return {
    record,
    token,
    get busy() { return busy; },
    approvals,
    last: () => events.length,
    after: (seq) => events.slice(Math.max(0, seq)),
    subscribe(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    send(prompt, message) {
      if (busy || closed) throw new Error('the session is busy or closed');
      return start(prompt, message);
    },
    post(build, line = QUEUED) {
      if (closed) return undefined;
      if (!busy) return postNow(build);
      waitLine ??= emit({ kind: 'system', text: line });
      held = build;
      return waitLine;
    },
    stop() {
      if (!busy) return false;
      approvals.release();
      agent.cancel();
      return true;
    },
    close() {
      closed = true;
      held = undefined;
      waitLine = undefined;
      approvals.release();
      agent.cancel();
      agent.close?.();
    },
  };
}
