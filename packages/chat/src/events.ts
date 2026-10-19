// The chat's events as types: the shapes of schema/chat-event.schema.json (the package's own
// contract, rule 6), written out so the core needs no schema reader. apps/board/tests checks that
// events of these types pass the schema, and that the kinds below are the schema's kinds.

/** What every event carries, stamped by the host: when, which session, its place from 1. */
export interface Stamp { at: string; session: string; seq: number }

/** One of the person's notes, or one card, sent with a message. `ref` is the note's seq or the card's number. */
export interface Chip { kind: 'note' | 'card'; ref: number; label: string }

export type WriteOp = 'create' | 'replace' | 'edit' | 'append';
/** A file the agent is about to create or change. */
export interface WriteFacts { kind: 'write'; op: WriteOp; path: string; preview?: string }
/** A shell command the agent is about to run; `risks` and `paths` may be empty. */
export interface CommandFacts { kind: 'command'; command: string; risks: string[]; paths: string[] }
export type Facts = WriteFacts | CommandFacts;

export type ApprovalStatus = 'approved' | 'denied' | 'expired' | 'released';
export type ApprovalScope = 'once' | 'session';
/** The person's answer to an approval request (the schema's `answer`). */
export interface ApprovalAnswer { approved: boolean; scope?: ApprovalScope }

export type ToolState = 'running' | 'done' | 'failed';
export type TurnEnd = 'done' | 'stopped' | 'error';

export interface MessageIn extends Stamp { kind: 'message_in'; text: string; chips?: Chip[] }
export interface MessageOut extends Stamp { kind: 'message_out'; text: string; interim?: true }
export interface ToolActivity extends Stamp {
  kind: 'tool_activity'; call: string; tool: string; state: ToolState; board?: string; cards?: number[]; head?: number;
}
export interface ApprovalRequest extends Stamp { kind: 'approval_request'; approvalId: string; facts: Facts; expiresAt: string }
export interface ApprovalResult extends Stamp {
  kind: 'approval_result'; approvalId: string; approved: boolean; status: ApprovalStatus; scope?: ApprovalScope;
}
export interface SystemLine extends Stamp { kind: 'system'; text: string; turn?: TurnEnd }

export type ChatEvent = MessageIn | MessageOut | ToolActivity | ApprovalRequest | ApprovalResult | SystemLine;

/** Every kind, in the schema's order. */
export const CHAT_EVENT_KINDS = ['message_in', 'message_out', 'tool_activity', 'approval_request', 'approval_result', 'system'] as const;
export type ChatEventKind = (typeof CHAT_EVENT_KINDS)[number];

/** The longest words a message carries (the schema's `text`). */
export const TEXT_MAX = 100_000;

/** The events the elements raise (they bubble). Named here, not in the element files, so a host can listen
 *  without loading the elements: the board loads them when the panel first opens. */
export const CHAT_SEND_EVENT = 'chat-send';
export const CHAT_CHIP_REMOVE_EVENT = 'chat-chip-remove';
export const CHAT_CHANGE_EVENT = 'chat-change';
export const CHAT_STOP_EVENT = 'chat-stop';
export const CHAT_NEW_SESSION_EVENT = 'chat-new-session';
export const CHAT_PICK_EVENT = 'chat-pick';
export const CHAT_ANSWER_EVENT = 'chat-answer';
