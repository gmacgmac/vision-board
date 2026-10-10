// One running chat session (chat-panel BE_03 ruling 1, api.md 99-101): the adapter's session, the
// events it has made since this server started (stamped here with `at`, `session` and `seq` from
// 1; a session loaded again after a restart starts with one line saying so), who is watching, the
// turn in progress, its approvals and its run token. One turn at a time; the adapter's updates are
// forwarded as chat events (`toChatEvent`). A message posted while a turn runs (the board's Send,
// panel-send ruling 1) waits, one at most, and goes when the turn ends, its text made then. The
// CLI's own transcript is the record, so nothing here is written to disk.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { AgentSession, ChatEventDraft } from '../../../packages/agent/src/index.ts';
import { toChatEvent } from '../../../packages/agent/src/index.ts';
import type { ApprovalDraft, Approvals } from './chat-approvals.ts';
import { createApprovals } from './chat-approvals.ts';
import type { StoredSession } from './chat-index.ts';
import type { Chip } from './chat-prompt.ts';

export type MessageIn = { kind: 'message_in'; text: string; chips?: Chip[] };
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
  /** A message whose text is both the prompt and the `message_in` (the board's Send): sent now
   * when no turn runs, else held until the turn ends (a system line says so) and its text made
   * then; posting again while one waits keeps the one. False once the session is closed. */
  post(text: () => string): 'sent' | 'queued' | false;
  /** Stop the running turn, releasing its approvals; false when nothing was running. */
  stop(): boolean;
  /** Stop for good: on a new session for the board, and when the server stops. */
  close(): void;
}

/** The first line of a session loaded again after a restart: its earlier events were in memory only. */
export const RESTARTED = 'Earlier messages aren\'t shown after a restart; the agent still remembers them.';
/** The line when the board's Send waits for the turn to end. */
export const QUEUED = 'Your answers go to the agent when it finishes this turn.';

/** A fresh run token: 32 random bytes, base64url. */
export const newRunToken = (): string => randomBytes(32).toString('base64url');

/** Whether `given` is this session's token, compared in constant time. */
export function hasToken(live: LiveSession, given: string): boolean {
  const a = Buffer.from(live.token);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

const reason = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function createLiveSession(
  record: StoredSession, agent: AgentSession, token: string, opts: { ttlMs?: number; resumed?: boolean; warn?: (m: string) => void } = {},
): LiveSession {
  const warn = opts.warn ?? ((m: string) => console.error(m));
  const events: ChatEvent[] = [];
  const listeners = new Set<(e: ChatEvent) => void>();
  let busy = false;
  let closed = false;
  let held: (() => string) | undefined;

  function emit(draft: Draft): ChatEvent {
    const event = { at: new Date().toISOString(), session: record.session, seq: events.length + 1, ...draft } as ChatEvent;
    events.push(event);
    for (const fn of [...listeners]) {
      try { fn(event); } catch (err) { warn(`chat: listener failed: ${reason(err)}`); }
    }
    return event;
  }

  const approvals = createApprovals<ChatEvent>(emit, opts.ttlMs);
  if (opts.resumed) emit({ kind: 'system', text: RESTARTED });

  async function run(prompt: string): Promise<void> {
    try {
      for await (const update of agent.prompt(prompt)) emit(toChatEvent(update));
    } catch (err) {
      emit({ kind: 'system', text: `The agent could not run: ${reason(err)}`, turn: 'error' });
    } finally {
      approvals.release();
      busy = false;
      const next = held;
      held = undefined;
      if (next && !closed) postNow(next);
    }
  }

  function start(prompt: string, message: MessageIn): ChatEvent {
    busy = true;
    const event = emit(message);
    void run(prompt);
    return event;
  }

  function postNow(text: () => string): void {
    try {
      const words = text();
      start(words, { kind: 'message_in', text: words });
    } catch (err) {
      emit({ kind: 'system', text: `The board's answers could not be sent: ${reason(err)}` });
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
    post(text) {
      if (closed) return false;
      if (!busy) {
        postNow(text);
        return 'sent';
      }
      if (!held) emit({ kind: 'system', text: QUEUED });
      held = text;
      return 'queued';
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
      approvals.release();
      agent.cancel();
      agent.close?.();
    },
  };
}
