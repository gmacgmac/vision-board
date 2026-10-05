// The project ledger (D-017): every node's identity and history, one event per line in
// `.visionboard/ledger.jsonl`. Append-only. A board version is a position in this file (its
// `seq`), never a separate file. Meaning only, never coordinates except a person's pin (rule 9).
// The shape's one source is the JSON Schema in packages/format/schema/ (rule 6, api.md 5-11);
// these types are hand-written and a test checks they agree with it (api.md 2).
import type { Kind, Region } from './view.ts';

/** The format new lines are written in. */
export const LEDGER_FORMAT = 3;
/** Every format a reader accepts. v3 only adds to v2, so v2 lines stay valid (api.md 11). */
export const LEDGER_FORMATS = [2, 3] as const;
export type LedgerFormat = (typeof LEDGER_FORMATS)[number];

/** Every action a person or agent can take, as recorded in an `act` event (rule 8). */
export const ACTION_IDS = [
  'ack', 'drop', 'comment', 'context', 'later', 'reopen', 'pin', 'unpin', 'mode',
  'grant', 'deny', 'revoke', 'size', 'send',
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

export const EVENT_TYPES = [
  'board', 'region', 'node', 'link', 'unlink', 'act', 'seen', 'reply', 'propose', 'park',
  'join', 'grant-request',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Event types only an agent writes; the rest of the rules for people live in the action layer. */
export const AGENT_EVENTS: ReadonlySet<EventType> = new Set([
  'board', 'region', 'node', 'link', 'unlink', 'reply', 'propose', 'park', 'join', 'grant-request',
]);
/** Event types only a person writes. */
export const PERSON_EVENTS: ReadonlySet<EventType> = new Set(['seen']);

/** The agent's size suggestion for a node (api.md 17). */
export const NODE_SIZES = ['s', 'm', 'l'] as const;
export type NodeSize = (typeof NODE_SIZES)[number];
/** The person's `size` action; `auto` clears it, like `unpin` (api.md 16). */
export const ACT_SIZES = [...NODE_SIZES, 'auto'] as const;
export type ActSize = (typeof ACT_SIZES)[number];

/** Stamped by the server on every event. `agent` names the caller: on v3 an agent id from
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

/** On every agent-written event: the agent's retry key (api.md 13, 29). */
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
 * `proposal` = the `seq` of the proposal they are accepting; `request` = the `seq` of the
 * `grant-request` a `grant` or `deny` answers; `holder` = the agent a `revoke` removes. */
export interface ActEvent extends Base {
  type: 'act'; action: ActionId; n?: number; ver?: number; text?: string; proposal?: number;
  x?: number; y?: number; board?: string; region?: string; mode?: Region['mode'];
  request?: number; holder?: string; size?: ActSize;
}
export interface SeenEvent extends Base { type: 'seen'; n: number; ver: number }
/** The agent answers an item without redrawing it. `to` = the `seq` of the act it answers. */
export interface ReplyEvent extends Base, Keyed { type: 'reply'; n: number; text: string; to?: number }
/** The agent proposes a decision; only the person can make it (D-018). */
export interface ProposeEvent extends Base, Keyed {
  type: 'propose'; n: number; ver: number; action: 'ack' | 'drop'; reason: string; source?: string;
}
export interface ParkEvent extends Base, Keyed { type: 'park'; n: number; bundle: ParkBundle }
/** An agent joins the project (D-027). Its stamped `agent` is the new agent id. */
export interface JoinEvent extends Base, Keyed { type: 'join'; label: string }
/** An agent asks the person for write access to one container (api.md 15, 23). */
export interface GrantRequestEvent extends Base, Keyed {
  type: 'grant-request'; board: string; region: string; reason: string;
}

export type LedgerEvent =
  | BoardEvent | RegionEvent | NodeEvent | LinkEvent | ActEvent
  | SeenEvent | ReplyEvent | ProposeEvent | ParkEvent | JoinEvent | GrantRequestEvent;
