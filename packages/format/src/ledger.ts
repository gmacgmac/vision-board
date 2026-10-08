// The project ledger (D-017): every node's identity and history, one event per line in
// `.visionboard/ledger.jsonl`. Append-only. A board version is a position in this file (its
// `seq`), never a separate file. Meaning only, never coordinates except a person's pin (rule 9).
// The shape's one source is the JSON Schema in packages/format/schema/ (rule 6, api.md 5-11);
// these types are hand-written and a test checks they agree with it (api.md 2).
import type { Kind, Region } from './view.ts';

/** The format new lines are written in. */
export const LEDGER_FORMAT = 10;
/** Every format a reader accepts. Each format only adds to the one before, so older lines stay
 * valid (api.md 11). v4 adds `note-edit` and `note-remove` (api.md 58-61); v5 adds a note on a
 * group of cards, `nodes` in place of `n` (api.md 62-65); v6 adds `move` and the built-in Later
 * container (api.md 66-70); v7 adds notes on and places for a whole container, `board` + `region`
 * in place of `n` (api.md 71-76); v8 adds a grant request and a revoke for a whole board, `region`
 * left out (api.md 81-86), and a `seen` for a whole board, `board` + `head` (api.md 87); v9 lets
 * the person write a `board` line, creating or renaming a board (api.md 90); v10 adds `reject`,
 * the person turning down an agent's proposal (api.md 93). */
export const LEDGER_FORMATS = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type LedgerFormat = (typeof LEDGER_FORMATS)[number];

/** Every action a person or agent can take, as recorded in an `act` event (rule 8). */
export const ACTION_IDS = [
  'ack', 'drop', 'comment', 'context', 'later', 'reopen', 'pin', 'unpin', 'mode',
  'grant', 'deny', 'revoke', 'size', 'send', 'note-edit', 'note-remove', 'move', 'reject',
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

/** The id of every board's built-in Later container (3_FE_03 ruling 5, api.md 66): a `move` may
 * name it; no agent draws it, and from ledger v6 no region may take its id. */
export const LATER_REGION = 'later';

/** Acts that may name a whole container with `board` + `region` in place of `n` (and `ver` and
 * `nodes`): a note on it, and its place on the board (3_FE_04 ruling 1, api.md 71). */
export const CONTAINER_ACTIONS: ReadonlySet<ActionId> = new Set(['comment', 'context', 'pin', 'unpin', 'note-edit', 'note-remove']);
/** Of those, the ones that place it; only these may name Later (api.md 72). */
export const CONTAINER_PLACES: ReadonlySet<ActionId> = new Set(['pin', 'unpin']);

/** Whether a well-formed act is about a whole container: one of `CONTAINER_ACTIONS` naming a
 * `region` (the shape rules then forbid `n`, `ver` and `nodes`). */
export const isContainerAct = (e: { action: ActionId; region?: string | undefined }): boolean =>
  e.region !== undefined && CONTAINER_ACTIONS.has(e.action);

/** The card an act names first: its `n`, or the first of its group's `nodes`. Its board is the
 * act's board (packages/actions `scopeOf` builds on this). */
export const actCard = (e: { n?: number | undefined; nodes?: number[] | undefined }): number | undefined => e.n ?? e.nodes?.[0];

export const EVENT_TYPES = [
  'board', 'region', 'node', 'link', 'unlink', 'act', 'seen', 'reply', 'propose', 'park',
  'join', 'grant-request',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Event types only an agent writes; the rest of the rules for people live in the action layer. */
export const AGENT_EVENTS: ReadonlySet<EventType> = new Set([
  'board', 'region', 'node', 'link', 'unlink', 'reply', 'propose', 'park', 'join', 'grant-request',
]);
/** Agent event types a person may also write, from the format given: the person's `board` line
 * creates a board or renames one (`put_board`, api.md 90). */
export const PERSON_TOO: Partial<Record<EventType, LedgerFormat>> = { board: 9 };
/** Event types only a person writes. */
export const PERSON_EVENTS: ReadonlySet<EventType> = new Set(['seen']);

/** The agent's size suggestion for a node (api.md 17). */
export const NODE_SIZES = ['s', 'm', 'l'] as const;
export type NodeSize = (typeof NODE_SIZES)[number];
/** The person's `size` action; `auto` clears it, like `unpin` (api.md 16). */
export const ACT_SIZES = [...NODE_SIZES, 'auto'] as const;
export type ActSize = (typeof ACT_SIZES)[number];
/** What a person's note asks for: a `comment`, or more context (api.md 59). */
export const NOTE_KINDS = ['comment', 'context'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

/** Stamped by the server on every event. `agent` names the caller: from v3 an agent id from
 * `join` (D-027), on v2 any name. `person` is written only once a board has more than one person
 * (D-018), so a single-person agent never sees it. */
interface Base {
  v: LedgerFormat;
  seq: number;
  at: string;
  by: 'person' | 'agent';
  agent?: string;
  person?: string;
}

/** On every agent-written event but `join`: the agent's retry key (api.md 13, 29). */
interface Keyed { key?: string }

/** What the agent says about a node. `item` = it asks the person for a response. */
export interface NodeBody {
  region: string;
  kind: Kind;
  title: string;
  body?: string;
  item?: boolean;
  lane?: string;
  tags?: string[];
  emphasis?: boolean;
  /** The agent's suggestion; the person's `size` action wins (api.md 17). */
  size?: NodeSize;
}

/** Handover written when an item is parked (D-020). */
export interface ParkBundle {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  sources?: string[];
}

/** A region as the ledger stores it: `center` is the centre node's number (api.md 18). The
 * View's `Region` names it by node id instead. */
export type LedgerRegion = Omit<Region, 'center'> & { center?: number };

export interface BoardEvent extends Base, Keyed { type: 'board'; board: string; title: string; summary?: string }
export interface RegionEvent extends Base, Keyed { type: 'region'; board: string; region: LedgerRegion }
/** A new version of node `n`. The server assigns `n` (per project, never reused) and `ver`. */
export interface NodeEvent extends Base, Keyed { type: 'node'; board: string; n: number; ver: number; node: NodeBody }
export interface LinkEvent extends Base, Keyed { type: 'link' | 'unlink'; from: number; to: number; label?: string }
/** A person's action from the action registry. `ver` = the node version they were looking at;
 * `proposal` = the `seq` of the proposal they are accepting (an `ack` or `drop`, the proposal's
 * own action) or turning down (`reject`, api.md 93); `request` = the `seq` of the
 * `grant-request` a `grant` or `deny` answers; `holder` = the agent a `revoke` removes (from the
 * container in `region`, or with no `region` from the board); `note` =
 * the `seq` of the `comment` or `context` act whose note a `note-edit` or `note-remove` changes,
 * and `kind` = what an edited note now asks for (api.md 58-61). `nodes` = the items a note on a
 * group of cards is on, in place of `n` and `ver` (api.md 62), or the cards a group `move` puts in
 * one container; `region` = that container for a `move` (api.md 66). With `board` + `region` in
 * place of `n` (and `ver`, `nodes`), a `comment`, `context`, `note-edit` or `note-remove` is about a
 * note on that whole container and a `pin` or `unpin` about its place, `x`/`y` then in board
 * coordinates (api.md 71). */
export interface ActEvent extends Base {
  type: 'act'; action: ActionId; n?: number; ver?: number; text?: string; proposal?: number;
  x?: number; y?: number; board?: string; region?: string; mode?: Region['mode'];
  request?: number; holder?: string; size?: ActSize; note?: number; kind?: NoteKind; nodes?: number[];
}
/** The person has seen version `ver` of node `n` (D-018), or, from v8, has looked at `board` up to
 * its line `head` (api.md 87). */
export type SeenEvent = Base & { type: 'seen' } & ({ n: number; ver: number } | { board: string; head: number });
/** The agent answers an item without redrawing it. `to` = the `seq` of the act it answers. */
export interface ReplyEvent extends Base, Keyed { type: 'reply'; n: number; text: string; to?: number }
/** The agent proposes a decision; only the person can make it (D-018). */
export interface ProposeEvent extends Base, Keyed {
  type: 'propose'; n: number; ver: number; action: 'ack' | 'drop'; reason: string; source?: string;
}
export interface ParkEvent extends Base, Keyed { type: 'park'; n: number; bundle: ParkBundle }
/** An agent joins the project (D-027). Its stamped `agent` is the new agent id. */
export interface JoinEvent extends Base { type: 'join'; label: string }
/** An agent asks the person for write access to one container, or with no `region` to the whole
 * board (api.md 15, 81). */
export interface GrantRequestEvent extends Base, Keyed {
  type: 'grant-request'; board: string; region?: string; reason: string;
}

export type LedgerEvent =
  | BoardEvent | RegionEvent | NodeEvent | LinkEvent | ActEvent
  | SeenEvent | ReplyEvent | ProposeEvent | ParkEvent | JoinEvent | GrantRequestEvent;
