// What the chat is in (PLAN ruling 11), as D-033 does for the board: one row per condition, saying
// what starts it and what ends it, what the header calls it, and whether the person can send a
// message or stop the turn while it holds. Every check of the chat's state reads this table; a
// check needed twice is a row, never a local check. Pure: from the feed's state and what only the
// host knows (`ChatHost`).
import type { ChatState } from './feed/feed-core.ts';

export const CHAT_CONDITION_KINDS = ['busy', 'waiting', 'blocked', 'stopped', 'error'] as const;
export type ChatConditionKind = (typeof CHAT_CONDITION_KINDS)[number];

/** What the host knows that no event says: why the chat can't take a message just now (a past
 *  version of the board showing, the agent refused to start, an older session), in plain words; and
 *  whether it `holds` a message with something attached (chips or the composer's context): it then
 *  takes one with no words, and one sent while the agent works, which it sends when the turn ends
 *  (the board: its cards, notes and answers). */
export interface ChatHost { blocked?: string; holds?: boolean }

/** How the header's status reads: `active` (working), `attention` (the person is needed),
 *  `quiet`, or `danger`. */
export type ChatTone = 'active' | 'attention' | 'quiet' | 'danger';

export interface ChatConditionRow {
  label: string;
  tone: ChatTone;
  startsWhen: string;
  endsWhen: string;
  /** Whether a message can be sent while it holds, and whether Stop does anything. */
  send: boolean;
  stop: boolean;
  holds: (s: ChatState, host: ChatHost) => boolean;
}

export const CHAT_CONDITIONS: Record<ChatConditionKind, ChatConditionRow> = {
  busy: {
    label: 'Working', tone: 'active', send: false, stop: true,
    startsWhen: 'the person\'s message is accepted (message_in)',
    endsWhen: 'a system line ends the turn (turn done, stopped or error)',
    holds: (s) => s.busy,
  },
  waiting: {
    label: 'Waiting for you', tone: 'attention', send: false, stop: true,
    startsWhen: 'the agent asks to change a file or run a command (approval_request)',
    endsWhen: 'its approval_result arrives, or the turn ends',
    holds: (s) => s.pending.length > 0,
  },
  blocked: {
    label: 'Can\'t send', tone: 'quiet', send: false, stop: false,
    startsWhen: 'the host says why the chat can\'t take a message (ChatHost.blocked)',
    endsWhen: 'the host clears the reason',
    holds: (_, host) => Boolean(host.blocked),
  },
  stopped: {
    label: 'Stopped', tone: 'quiet', send: true, stop: false,
    startsWhen: 'a system line ends the turn as stopped (the person pressed Stop)',
    endsWhen: 'the person\'s next message (message_in)',
    holds: (s) => s.ended === 'stopped',
  },
  error: {
    label: 'Error', tone: 'danger', send: true, stop: false,
    startsWhen: 'a system line ends the turn as an error',
    endsWhen: 'the person\'s next message (message_in)',
    holds: (s) => s.ended === 'error',
  },
};

/** Which condition the header names when several hold: the one that most needs the person. */
const STATUS_ORDER: readonly ChatConditionKind[] = ['waiting', 'busy', 'blocked', 'error', 'stopped'];

/** Every condition that holds, in the table's order. */
export function chatConditions(s: ChatState, host: ChatHost = {}): ChatConditionKind[] {
  return CHAT_CONDITION_KINDS.filter((k) => CHAT_CONDITIONS[k].holds(s, host));
}

export interface ChatStatus { kind: ChatConditionKind | 'ready'; label: string; tone: ChatTone }

/** The one status the header shows; `ready` when nothing holds. */
export function chatStatus(s: ChatState, host: ChatHost = {}): ChatStatus {
  const holding = chatConditions(s, host);
  const kind = STATUS_ORDER.find((k) => holding.includes(k));
  return kind ? { kind, label: CHAT_CONDITIONS[kind].label, tone: CHAT_CONDITIONS[kind].tone } : { kind: 'ready', label: 'Ready', tone: 'quiet' };
}

/** Whether every condition that holds lets the person send. */
export const canSend = (s: ChatState, host: ChatHost = {}): boolean => chatConditions(s, host).every((k) => CHAT_CONDITIONS[k].send);
/** Whether any condition that holds has a turn to stop. */
export const canStop = (s: ChatState, host: ChatHost = {}): boolean => chatConditions(s, host).some((k) => CHAT_CONDITIONS[k].stop);
