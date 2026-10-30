// Chat feed pattern, layer 1 (core): a reducer from chat events (schema/chat-event.schema.json) to
// what the feed shows (FE_01 ruling 2; PLAN ruling 6). The feed shows only words: the person's
// message with its chips, the agent's text (interim, then the reply), a change chip for each board
// write, approval cards (settled in place) and system lines. A tool shows only as the one status
// line while it runs (`activityLine`). Pure and immutable: an entry that did not change is the same
// object after an event, so an element redraws only what changed (rule 15). No DOM.
import type { ApprovalScope, ApprovalStatus, AttachedFile, ChatEvent, Chip, Facts, TurnEnd } from '../events.ts';

/** `files`: what it attached, left out when none. */
export interface PersonEntry { type: 'person'; key: string; text: string; chips: readonly Chip[]; files?: readonly AttachedFile[] }
export interface AgentEntry { type: 'agent'; key: string; text: string; interim: boolean }
/** A board write that finished: the board, the cards it drew or changed, and the ledger position after it. */
export interface ChangeEntry { type: 'change'; key: string; board: string; cards: readonly number[]; head?: number }
/** How an approval was settled (the approval_result's facts). */
export interface Settled { approved: boolean; status: ApprovalStatus; scope?: ApprovalScope }
/** `expiresAt`: when the request lapses; none, it waits for the person. `scopes`: the answers its yes may have; none, the older host's two. */
export interface ApprovalEntry {
  type: 'approval'; key: string; approvalId: string; facts: Facts; expiresAt?: string; scopes?: readonly ApprovalScope[]; result?: Settled;
}
export interface SystemEntry { type: 'system'; key: string; text: string; turn?: TurnEnd }
export type FeedEntry = PersonEntry | AgentEntry | ChangeEntry | ApprovalEntry | SystemEntry;

/** A tool call between its `running` and its end; `board` for a board write. */
export interface RunningTool { call: string; tool: string; board?: string }

export interface ChatState {
  /** The session the events belong to; an event of another session starts the feed over. */
  readonly session?: string;
  /** The last event applied; an event at or before it is passed over (a stream that reconnects). */
  readonly seq: number;
  readonly entries: readonly FeedEntry[];
  readonly running: readonly RunningTool[];
  /** Approval ids still waiting for the person. */
  readonly pending: readonly string[];
  /** From the person's message to the line that ends the turn. */
  readonly busy: boolean;
  /** How the last turn ended when it did not end well, until the next message. */
  readonly ended?: 'stopped' | 'error';
  /** What the agent did last in this turn, for the status line. */
  readonly last?: 'text' | 'tool';
}

export const EMPTY_CHAT: ChatState = { seq: 0, entries: [], running: [], pending: [], busy: false };

const keyOf = (e: ChatEvent) => `e${e.seq}`;
const add = (s: ChatState, entry: FeedEntry): readonly FeedEntry[] => [...s.entries, entry];

function tool(s: ChatState, e: Extract<ChatEvent, { kind: 'tool_activity' }>): ChatState {
  const others = s.running.filter((t) => t.call !== e.call);
  if (e.state === 'running') {
    const t: RunningTool = { call: e.call, tool: e.tool, ...(e.board !== undefined && { board: e.board }) };
    return { ...s, running: [...others, t], last: 'tool' };
  }
  const done = e.state === 'done' && e.board !== undefined;
  const change: ChangeEntry | undefined = done
    ? { type: 'change', key: keyOf(e), board: e.board!, cards: e.cards ?? [], ...(e.head !== undefined && { head: e.head }) }
    : undefined;
  return { ...s, running: others, last: 'tool', ...(change && { entries: add(s, change) }) };
}

function settle(s: ChatState, e: Extract<ChatEvent, { kind: 'approval_result' }>): ChatState {
  const result: Settled = { approved: e.approved, status: e.status, ...(e.scope && { scope: e.scope }) };
  const entries = s.entries.map((x) => (x.type === 'approval' && x.approvalId === e.approvalId ? { ...x, result } : x));
  return { ...s, entries, pending: s.pending.filter((id) => id !== e.approvalId) };
}

function system(s: ChatState, e: Extract<ChatEvent, { kind: 'system' }>): ChatState {
  // A turn that ended well needs no line: the reply already ended it. Stopped and error stay shown.
  const shown = e.turn !== 'done';
  const entries = shown ? add(s, { type: 'system', key: keyOf(e), text: e.text, ...(e.turn && { turn: e.turn }) }) : s.entries;
  if (!e.turn) return { ...s, entries };
  const { ended: _, last: __, ...rest } = s;
  return { ...rest, entries, busy: false, running: [], pending: [], ...(e.turn !== 'done' && { ended: e.turn }) };
}

function reduce(s: ChatState, e: ChatEvent): ChatState {
  switch (e.kind) {
    case 'message_in': {
      const { ended: _, last: __, ...rest } = s;
      return { ...rest, busy: true, running: [], entries: add(s, { type: 'person', key: keyOf(e), text: e.text, chips: e.chips ?? [], ...(e.files && { files: e.files }) }) };
    }
    case 'message_out':
      return { ...s, last: 'text', entries: add(s, { type: 'agent', key: keyOf(e), text: e.text, interim: e.interim === true }) };
    case 'tool_activity': return tool(s, e);
    case 'approval_request': {
      const entry: ApprovalEntry = {
        type: 'approval', key: `a-${e.approvalId}`, approvalId: e.approvalId, facts: e.facts,
        ...(e.expiresAt !== undefined && { expiresAt: e.expiresAt }), ...(e.scopes && { scopes: e.scopes }),
      };
      return { ...s, entries: add(s, entry), pending: [...s.pending, e.approvalId] };
    }
    case 'approval_result': return settle(s, e);
    case 'system': return system(s, e);
  }
}

/** The state after one event. An event of another session starts from empty; one already seen changes nothing. */
export function applyEvent(s: ChatState, e: ChatEvent): ChatState {
  const base = s.session !== undefined && s.session !== e.session ? EMPTY_CHAT : s;
  if (base === s && e.seq <= s.seq) return s;
  return { ...reduce(base, e), session: e.session, seq: e.seq };
}

export function applyEvents(s: ChatState, events: readonly ChatEvent[]): ChatState {
  return events.reduce(applyEvent, s);
}

/** The one quiet line under the feed while the agent works; null when it is not working. */
export function activityLine(s: ChatState): string | null {
  if (!s.busy) return null;
  if (s.pending.length) return 'Waiting for your answer';
  const t = s.running.at(-1);
  if (t) return t.board !== undefined ? 'Drawing on the board…' : `Using ${t.tool}…`;
  return s.last === 'text' ? 'Writing…' : 'Thinking…';
}

/** What a change chip says: "Drew 3 cards on Pricing". `boardName` is the host's (a board's title). */
export function changeLabel(c: ChangeEntry, boardName: (id: string) => string = (id) => id): string {
  const on = boardName(c.board);
  const n = c.cards.length;
  return n === 0 ? `Wrote on ${on}` : `Drew ${n} card${n === 1 ? '' : 's'} on ${on}`;
}

// Following the latest. On by default; only the person's own scrolling away turns it off, and
// reaching the end again (or sending) turns it back on. Nothing the page does counts. No DOM.

/** What the feed reads of its log to decide: the scroll position and the two heights. */
export interface LogMetrics { scrollTop: number; scrollHeight: number; clientHeight: number }

/** How close to the end still counts as at the end, in pixels. */
export const BOTTOM_PX = 4;

export const atBottom = (m: LogMetrics): boolean => m.scrollHeight - m.scrollTop - m.clientHeight <= BOTTOM_PX;

/** An input the person made on the log that moves the view up. */
export type PersonInput = { kind: 'wheel'; deltaY: number } | { kind: 'key'; key: string; shift: boolean };

const UP_KEYS = new Set(['PageUp', 'Home', 'ArrowUp']);

/** Whether `input` takes the view up, with room above it to go: the person scrolling away from the latest. */
export function leavesLatest(input: PersonInput, m: LogMetrics): boolean {
  if (m.scrollTop <= 0) return false;
  return input.kind === 'wheel' ? input.deltaY < 0 : UP_KEYS.has(input.key) || (input.key === ' ' && input.shift);
}

/** What a scroll event tells: which way it went, and whether the person is moving the view (the wheel, a key, the scrollbar, a touch). */
export interface ScrollMove { down: boolean; person: boolean }

/** Following after a scroll event: on when the view moves down to the end (a first step up from the end,
 *  smooth scrolling, is still within a few pixels of it and does not count); off the end it turns off
 *  only while the person moves the view, never for a scroll the page made. */
export function followAfterScroll(following: boolean, m: LogMetrics, move: ScrollMove): boolean {
  if (atBottom(m)) return move.down || following;
  return move.person ? false : following;
}
