// Every thing a person or agent can do on the board, declared once (project rule 8, api.md 19).
// Person actions are `act` events (`ActionId`); agent actions are their own records, written
// through `write_board` or `request_grant`, never as an `act`.
import type { ActionId, Kind } from '../../format/src/index.ts';
import { NODE_TYPES } from '../../format/src/index.ts';

/** Where a card stands with the person. `commented`: a note waits for the agent, and the card is
 * still open. `context` is no longer reached: an old More context reads as a note (D-045). */
export type ItemStatus = 'open' | 'acknowledged' | 'dropped' | 'commented' | 'context' | 'later';
/** The statuses that answer a card that needs an answer, and close it, ✓ or ✗ (D-045): nothing is
 * owed on the answer and its proposals end. A note never answers a card, so a card with a note is
 * still open and its note still owed. On an old board ✓ or ✗ closes a card of any kind too
 * (every-node ruling 8), but only a card that needs an answer counts as answered (`isDecided`). */
export const CLOSED: ReadonlySet<ItemStatus> = new Set(['acknowledged', 'dropped']);
/** The same set as `CLOSED` (D-045): what "answered" counts. */
export const DECIDED: ReadonlySet<ItemStatus> = CLOSED;

/** Whether a card of `kind` in `status` is answered: only a card that needs an answer can be. */
export const isDecided = (kind: Kind, status: ItemStatus): boolean => NODE_TYPES[kind].answer && DECIDED.has(status);

/** How `check_responses` names an act to the agent (D-045, the API edge, like the format's
 * `toLine`): ✓ is `check` and ✗ is `cross`, tools with no meaning of their own; the card the agent
 * wrote says what they mean. Every other action keeps its id. The ledger keeps `ack` and `drop`. */
export const ACTION_OUT = { ack: 'check', drop: 'cross' } as const satisfies Partial<Record<ActionId, string>>;
/** An action as the agent reads it. */
export type ReportedAction = Exclude<ActionId, keyof typeof ACTION_OUT> | (typeof ACTION_OUT)[keyof typeof ACTION_OUT];
export const actionOut = (a: ActionId): ReportedAction => (a in ACTION_OUT ? ACTION_OUT[a as keyof typeof ACTION_OUT] : a as ReportedAction);
/** `ACTION_OUT` read the other way, for what an agent sends (`propose`'s `check` or `cross`). */
const ACTION_IN = Object.fromEntries(Object.entries(ACTION_OUT).map(([id, word]) => [word, id])) as Record<string, ActionId>;
/** The stored id for an action word an agent sent; any other word is returned as it came. */
export const actionIn = (word: string): string => (Object.hasOwn(ACTION_IN, word) ? ACTION_IN[word]! : word);

/** How every agent read names a card's status (D-045, the API edge, beside `ACTION_OUT`): ✓ is
 * `checked` and ✗ `crossed`. The page and the ledger keep `acknowledged` and `dropped`. */
export const STATUS_OUT = { acknowledged: 'checked', dropped: 'crossed' } as const satisfies Partial<Record<ItemStatus, string>>;
/** A status as the agent reads it. */
export type ReportedStatus = Exclude<ItemStatus, keyof typeof STATUS_OUT> | (typeof STATUS_OUT)[keyof typeof STATUS_OUT];
export const statusOut = (s: ItemStatus): ReportedStatus => (s in STATUS_OUT ? STATUS_OUT[s as keyof typeof STATUS_OUT] : s as ReportedStatus);

/** What every registry entry says, for people and agents alike. */
interface Common {
  label: string;
  /** Who may take it. An agent never writes an `act` (rule 8). */
  by: 'person' | 'agent';
  /** A decision only a person's click makes (rule 8): acknowledge, drop, later, grant, deny,
   * revoke, archive. The page never takes it for the person. */
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
  // ✓ and ✗ are named for what they are, Check and Cross, never for a meaning (D-045).
  ack: { id: 'ack', label: 'Check', key: 'a', ...decision, onItem: true, status: 'acknowledged', reply: '✓' },
  drop: { id: 'drop', label: 'Cross', key: 'x', ...decision, onItem: true, status: 'dropped', reply: '✗' },
  comment: { id: 'comment', label: 'Comment', key: 'c', ...person, onItem: true, text: 'required', reply: 'comment' },
  // Kept so old lines read and the server still takes one (D-045): no card offers it, no key presses
  // it, and it reads as a note everywhere (notes.ts `itemOf`).
  context: { id: 'context', label: 'More context', ...person, onItem: true, text: 'optional', reply: 'comment' },
  later: { id: 'later', label: 'Save for later', key: 'l', ...decision, onItem: true, status: 'later', reply: 'saved for later' },
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
  // Ledger v12 (api.md 128): the person's private mark on any card. Not an answer (`onItem` false,
  // so Send never carries it) and no agent reads it. Its key (F in assumption A) is the page's to
  // bind: F is Fit today.
  flag: { id: 'flag', label: 'Flag', ...person, onItem: false },
  unflag: { id: 'unflag', label: 'Remove flag', ...person, onItem: false },
  // Ledger v13 (api.md 132): a container's card widths, Match or Own, from its toolbar like the mode.
  widths: { id: 'widths', label: 'Card widths', ...person, onItem: false },
  // Ledger v14 (api.md 135): the person hides a whole board from every agent, and brings it back.
  // Archiving takes the board away from the agents, so the page asks first; restoring does not.
  archive: { id: 'archive', label: 'Archive board', ...decision, onItem: false },
  restore: { id: 'restore', label: 'Restore', ...person, onItem: false },
  // Ledger v15 (api.md 138): the person makes a whole board read-only for everyone, and ends it.
  // Nothing is lost either way, so the page asks neither time.
  lock: { id: 'lock', label: 'Lock board', ...person, onItem: false },
  unlock: { id: 'unlock', label: 'Unlock board', ...person, onItem: false },
};

/** The review buttons an item offers: an act among them must be one its kind offers (act.ts). */
export const ITEM_ACTIONS: readonly ActionId[] = ['ack', 'drop', 'comment', 'later'];

/** The acts that set a card's mark outright: ✓, ✗, Later and clear (`reopen`). The agent reads
 * each card's latest one, not every click (pending.ts, D-045). */
export const MARK_ACTIONS: ReadonlySet<ActionId> = new Set(['ack', 'drop', 'later', 'reopen']);

/** Whether a person act is an answer: an act on an item (✓, ✗, a note, Later, Reopen,
 * a note changed or removed, a proposal turned down) or a note on a whole container. What the Send
 * message carries (pending.ts `replyScope`) and what Send waits for (conditions `board.unsent`). */
export const isAnswer = (action: ActionId): boolean => ACTIONS[action].onItem;

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

/** What the person takes off a board (N24, api.md 141): the person's `retire` line through
 * `retire_cards`, the same line an agent's retire item writes. Remove card on a selection of cards
 * (the selection bar, Delete), Remove container in a container's settings. It takes cards away, so
 * the page asks first. */
export const RETIRE_ACTION_IDS = ['remove-cards', 'remove-container'] as const;
export type RetireActionId = (typeof RETIRE_ACTION_IDS)[number];

export interface RetireActionDef extends Common {
  id: RetireActionId;
  by: 'person';
  needsConfirmation: true;
  /** The inputs the person gives, by name: `retire_cards`' body. */
  inputs: Readonly<Record<string, 'required' | 'optional'>>;
}

export const RETIRE_ACTIONS: Record<RetireActionId, RetireActionDef> = {
  'remove-cards': { id: 'remove-cards', label: 'Remove card', ...decision, inputs: { cards: 'required' } },
  'remove-container': { id: 'remove-container', label: 'Remove container', ...decision, inputs: { region: 'required' } },
};
