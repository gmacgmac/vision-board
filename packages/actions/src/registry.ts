// Every thing a person or agent can do on the board, declared once (project rule 8, api.md 19).
// Person actions are `act` events (`ActionId`); agent actions are their own records, written
// through `write_board` or `request_grant`, never as an `act`.
import type { ActionId, Kind } from '../../format/src/index.ts';
import { NODE_TYPES } from '../../format/src/index.ts';

export type ItemStatus = 'open' | 'acknowledged' | 'dropped' | 'commented' | 'context' | 'later';
/** The statuses that decide a card that needs an answer (every-node ruling 3, api.md 120): ✓, ✗
 * or a comment. More context keeps it open. A card of any other kind is never decided. */
export const DECIDED: ReadonlySet<ItemStatus> = new Set(['acknowledged', 'dropped', 'commented']);
/** The statuses that close a card outright, ✓ or ✗ (on an old board, any kind, ruling 8): nothing is
 * owed on it and its proposals end. A comment decides but stays owed an answer (ruling 5). */
export const CLOSED: ReadonlySet<ItemStatus> = new Set(['acknowledged', 'dropped']);

/** Whether a card of `kind` in `status` is decided: only a card that needs an answer can be. */
export const isDecided = (kind: Kind, status: ItemStatus): boolean => NODE_TYPES[kind].answer && DECIDED.has(status);

/** What every registry entry says, for people and agents alike. */
interface Common {
  label: string;
  /** Who may take it. An agent never writes an `act` (rule 8). */
  by: 'person' | 'agent';
  /** A decision only a person's click makes (rule 8): acknowledge, drop, later, grant, deny,
   * revoke. The page never takes it for the person. */
  needsConfirmation: boolean;
}

export interface ActionDef extends Common {
  id: ActionId;
  /** Keyboard shortcut while an item has focus. */
  key?: string;
  /** Acts on a numbered item. */
  onItem: boolean;
  text?: 'required' | 'optional';
  /** Status the item moves to. */
  status?: ItemStatus;
  /** How it reads in the numbered reply. */
  reply?: string;
}

const person = { by: 'person', needsConfirmation: false } as const;
const decision = { by: 'person', needsConfirmation: true } as const;

export const ACTIONS: Record<ActionId, ActionDef> = {
  ack: { id: 'ack', label: 'Acknowledge', key: 'a', ...decision, onItem: true, status: 'acknowledged', reply: 'ok' },
  drop: { id: 'drop', label: 'Drop', key: 'x', ...decision, onItem: true, status: 'dropped', reply: 'drop' },
  comment: { id: 'comment', label: 'Comment', key: 'c', ...person, onItem: true, text: 'required', reply: 'comment' },
  context: { id: 'context', label: 'More context', key: 'm', ...person, onItem: true, text: 'optional', status: 'context', reply: 'more context' },
  later: { id: 'later', label: 'Save for later', key: 'l', ...decision, onItem: true, status: 'later', reply: 'later' },
  reopen: { id: 'reopen', label: 'Reopen', key: 'o', ...person, onItem: true, status: 'open' },
  pin: { id: 'pin', label: 'Move', ...person, onItem: false },
  unpin: { id: 'unpin', label: 'Reset position', ...person, onItem: false },
  mode: { id: 'mode', label: 'Change layout', ...person, onItem: false },
  // Ledger v3 (api.md 16). No item status, so none of them appears in the numbered reply.
  grant: { id: 'grant', label: 'Allow', ...decision, onItem: false },
  deny: { id: 'deny', label: 'Refuse', ...decision, onItem: false, text: 'optional' },
  revoke: { id: 'revoke', label: 'Remove access', ...decision, onItem: false },
  size: { id: 'size', label: 'Card size', ...person, onItem: false },
  send: { id: 'send', label: 'Send to agent', ...person, onItem: false },
  // Ledger v4 (api.md 58-61): change a note not yet sent, named by the act that made it. No status
  // of their own; the item's status is worked out again from its notes (notes.ts).
  'note-edit': { id: 'note-edit', label: 'Edit note', ...person, onItem: true, text: 'required' },
  'note-remove': { id: 'note-remove', label: 'Remove note', ...person, onItem: true },
  // Ledger v6 (api.md 66-70): put cards in a container on their board or in the built-in Later.
  // The person's move wins over the agent's region (3_FE_03 ruling 2).
  move: { id: 'move', label: 'Move to', ...person, onItem: false },
  // Ledger v10 (api.md 93): turn down an agent's proposal, named by its `seq`. Not a decision on
  // the item, so no status; accepting is the proposal's own action (`ack` or `drop`) with `proposal`.
  reject: { id: 'reject', label: 'Reject', ...person, onItem: true },
};

/** The review buttons an item offers. */
export const ITEM_ACTIONS: readonly ActionId[] = ['ack', 'drop', 'comment', 'context', 'later'];

/** What an agent can do besides drawing: write items (`reply`, `propose`, `park`) and the
 * `request_grant` operation (api.md 19, 24-26, 42). */
export const AGENT_ACTION_IDS = ['reply', 'propose', 'park', 'request_grant'] as const;
export type AgentActionId = (typeof AGENT_ACTION_IDS)[number];

export interface AgentActionDef extends Common {
  id: AgentActionId;
  by: 'agent';
  needsConfirmation: false;
  /** The inputs the agent sends, by name. */
  inputs: Readonly<Record<string, 'required' | 'optional'>>;
}

const agent = { by: 'agent', needsConfirmation: false } as const;

export const AGENT_ACTIONS: Record<AgentActionId, AgentActionDef> = {
  reply: { id: 'reply', label: 'Reply', ...agent, inputs: { n: 'required', text: 'required', to: 'optional' } },
  propose: {
    id: 'propose', label: 'Propose a decision', ...agent,
    inputs: { n: 'required', ver: 'required', action: 'required', reason: 'required', source: 'optional' },
  },
  park: { id: 'park', label: 'Write the handover', ...agent, inputs: { n: 'required', bundle: 'required' } },
  request_grant: {
    id: 'request_grant', label: 'Ask for access', ...agent,
    inputs: { board: 'required', region: 'required', reason: 'required' },
  },
};

/** What the person does to a whole board besides an `act`: a person `board` line through
 * `put_board` (api.md 90, D-034), from the board picker. Not decisions, so no confirmation. */
export const BOARD_ACTION_IDS = ['new-board', 'rename-board'] as const;
export type BoardActionId = (typeof BOARD_ACTION_IDS)[number];

export interface BoardActionDef extends Common {
  id: BoardActionId;
  by: 'person';
  needsConfirmation: false;
  /** The inputs the person gives, by name: `put_board`'s body. */
  inputs: Readonly<Record<string, 'required' | 'optional'>>;
}

const boardInputs = { title: 'required', summary: 'optional' } as const;

export const BOARD_ACTIONS: Record<BoardActionId, BoardActionDef> = {
  'new-board': { id: 'new-board', label: 'New board', ...person, inputs: boardInputs },
  'rename-board': { id: 'rename-board', label: 'Rename board', ...person, inputs: boardInputs },
};
