// The project ledger (D-017): every node's identity and history, one event per line in
// `.visionboard/ledger.jsonl`. Append-only. A board version is a position in this file (its
// `seq`), never a separate file. Meaning only, never coordinates except a person's pin (rule 9).
import type { Kind, Region } from './view.ts';

export const LEDGER_FORMAT = 2;

/** Every action a person or agent can take, as recorded in an `act` event (rule 8). */
export const ACTION_IDS = [
  'ack', 'drop', 'comment', 'context', 'later', 'reopen', 'pin', 'unpin', 'mode',
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

export const EVENT_TYPES = [
  'board', 'region', 'node', 'link', 'unlink', 'act', 'seen', 'reply', 'propose', 'park',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Event types only an agent writes; the rest of the rules for people live in the action layer. */
export const AGENT_EVENTS: ReadonlySet<EventType> = new Set([
  'board', 'region', 'node', 'link', 'unlink', 'reply', 'propose', 'park',
]);
/** Event types only a person writes. */
export const PERSON_EVENTS: ReadonlySet<EventType> = new Set(['seen']);

/** Stamped by the server on every event. `agent` names the caller (D-019). `person` is written
 * only once a board has more than one person (D-018), so a single-person agent never sees it. */
interface Base {
  v: typeof LEDGER_FORMAT;
  seq: number;
  at: string;
  by: 'person' | 'agent';
  agent?: string;
  person?: string;
}

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
}

/** Handover written when an item is parked (D-020). */
export interface ParkBundle {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  sources?: string[];
}

export interface BoardEvent extends Base { type: 'board'; board: string; title: string; summary?: string }
export interface RegionEvent extends Base { type: 'region'; board: string; region: Region }
/** A new version of node `n`. The server assigns `n` (per project, never reused) and `ver`. */
export interface NodeEvent extends Base { type: 'node'; board: string; n: number; ver: number; node: NodeBody }
export interface LinkEvent extends Base { type: 'link' | 'unlink'; from: number; to: number; label?: string }
/** A person's action from the action registry. `ver` = the node version they were looking at;
 * `proposal` = the `seq` of the proposal they are accepting. */
export interface ActEvent extends Base {
  type: 'act'; action: ActionId; n?: number; ver?: number; text?: string; proposal?: number;
  x?: number; y?: number; board?: string; region?: string; mode?: Region['mode'];
}
export interface SeenEvent extends Base { type: 'seen'; n: number; ver: number }
/** The agent answers an item without redrawing it. `to` = the `seq` of the act it answers. */
export interface ReplyEvent extends Base { type: 'reply'; n: number; text: string; to?: number }
/** The agent proposes a decision; only the person can make it (D-018). */
export interface ProposeEvent extends Base {
  type: 'propose'; n: number; ver: number; action: 'ack' | 'drop'; reason: string; source?: string;
}
export interface ParkEvent extends Base { type: 'park'; n: number; bundle: ParkBundle }

export type LedgerEvent =
  | BoardEvent | RegionEvent | NodeEvent | LinkEvent | ActEvent
  | SeenEvent | ReplyEvent | ProposeEvent | ParkEvent;
