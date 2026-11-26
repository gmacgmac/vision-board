// The project ledger (D-017, D-041 proposed): every card's identity and history, one event per
// line in `.visionboard/ledger.jsonl`. Append-only. A card's identity is its ledger number, given
// once per project and never reused: `id` in code, written `n` in the file (ledger-line.ts turns
// one into the other). Every request and answer names a card by its board number instead (`n`,
// api.md 125), which the server works out at its edge. A board version is a position in this file (its
// `seq`), never a separate file. Meaning only, never coordinates except a person's pin (rule 9).
// The shape's one source is the JSON Schema in packages/format/schema/ (rule 6, api.md 5-11);
// these types are hand-written and a test checks they agree with it (api.md 2).
import type { AppRef } from './apps.ts';
import type { Direction, Kind, Region, Skin, Tone, Widths } from './view.ts';
import { DIRECTIONS } from './view.ts';
import * as formatLedgerWords from './words/format-ledger.ts';

/** The ledger format: the one the server writes and the one the reader, the schema and the fold know (D-103). An
 * older ledger is migrated to it, line for line (`migrate/`, `npm run ledger:migrate`); a line in an older format is
 * refused with words that say so, and one in a newer format leaves the ledger read-only (D-103 4). What each format
 * added: api.md's "Ledger vN" points; v20 renamed the person's `flag` and `unflag` to `bookmark` and `unbookmark` and
 * added a board's skin, a node's icon and tone, the `icon` line, the person's `ask` and a flow's
 * `direction` (api.md 182-189); v21 = the node's `timeline` key; the step restamps, no line's meaning changes (api.md
 * 190, D-105); v22 = the person's `region`, `node` and `link` lines (a person's import, `PERSON_TOO`); a restamp too
 * (api.md 201, D-108); v23 = the person's `folders-allow` and `folders-revoke` (api.md 215, D-120). */
export const LEDGER_FORMAT = 23;

/** Every action a person or agent can take, as recorded in an `act` event (rule 8). */
export const ACTION_IDS = [
  'ack', 'drop', 'comment', 'context', 'later', 'reopen', 'pin', 'unpin', 'mode',
  'grant', 'deny', 'revoke', 'size', 'send', 'note-edit', 'note-remove', 'move', 'reject', 'bookmark', 'unbookmark', 'notes-hide', 'notes-show', 'widths',
  'archive', 'restore', 'lock', 'unlock', 'app-allow', 'app-revoke', 'skin', 'ask', 'direction',
  'folders-allow', 'folders-revoke',
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

/** The person's marks on one card: the bookmark (api.md 128, 182), and putting its notes away or back (api.md 156). */
export const CARD_MARKS: ReadonlySet<ActionId> = new Set(['bookmark', 'unbookmark', 'notes-hide', 'notes-show']);
/** The person's marks on a whole board: archive hides it from every agent, restore brings it back
 * (api.md 135); lock makes it read-only for everyone, unlock ends that (api.md 138). Each names its
 * `board` and nothing else. */
export const BOARD_MARKS: ReadonlySet<ActionId> = new Set(['archive', 'restore', 'lock', 'unlock']);
/** The person's own marks (api.md 128, 135, 138, 156): no agent ever reads their lines. Every agent read,
 * the Send message and Send's "something new" test leave these acts out, and they move nothing an
 * agent reads (no head, no seen, no condition); a lock shows to agents only as a board's `locked`. */
export const PRIVATE_ACTIONS: ReadonlySet<ActionId> = new Set([...CARD_MARKS, ...BOARD_MARKS]);
/** Whether an act is the person's private mark. */
export const isPrivateAct = (e: { type: string; action?: string }): boolean =>
  e.type === 'act' && PRIVATE_ACTIONS.has(e.action as ActionId);

/** The person's allow of an app's code at one version, and the stop that takes it back (api.md 150,
 * D-047 ruling 7). Each names its `app` (an allow also its `hash`) and nothing else: an app is on no
 * board and no card, so these move no head, answer nothing and no board's lock holds them. */
export const APP_ACTIONS: ReadonlySet<ActionId> = new Set(['app-allow', 'app-revoke']);

/** The person lets agents working in other folders call this ledger's board, and stops that (api.md 215, D-120). Each
 * names nothing else: like an app's allow it is on no board and no card, so it moves no head, answers nothing and no
 * board's lock holds it. */
export const FOLDER_ACTIONS: ReadonlySet<ActionId> = new Set(['folders-allow', 'folders-revoke']);

/** The id of every board's built-in Later container (3_FE_03 ruling 5, api.md 66): a `move` may
 * name it; no agent draws it, and no region may take its id. */
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

/** The card an act names first: its `id`, or the first of its group's `nodes`. Its board is the
 * act's board (packages/actions `scopeOf` builds on this). */
export const actCard = (e: { id?: number | undefined; nodes?: number[] | undefined }): number | undefined => e.id ?? e.nodes?.[0];

export const EVENT_TYPES = [
  'board', 'region', 'node', 'link', 'unlink', 'act', 'seen', 'reply', 'propose', 'park',
  'join', 'grant-request', 'retire', 'icon',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Event types only an agent writes; the rest of the rules for people live in the action layer. */
export const AGENT_EVENTS: ReadonlySet<EventType> = new Set([
  'board', 'region', 'node', 'link', 'unlink', 'reply', 'propose', 'park', 'join', 'grant-request', 'retire', 'icon',
]);
/** Agent event types a person may also write: the person's `board` line creates a board or renames one (`put_board`,
 * api.md 90); the person's `retire` line removes cards or a container (`retire_cards`, api.md 141); the person's `icon`
 * line accepts a changed drawing of a library icon (api.md 185); the person's `region`, `node` and `link` lines draw
 * what the person imports from a file (`write_board`'s `import`, api.md 201, D-108). */
export const PERSON_TOO: ReadonlySet<EventType> = new Set(['board', 'retire', 'icon', 'region', 'node', 'link']);
/** Event types only a person writes. */
export const PERSON_EVENTS: ReadonlySet<EventType> = new Set(['seen']);

/** The agent's size suggestion for a node (api.md 17). */
export const NODE_SIZES = ['s', 'm', 'l'] as const;
export type NodeSize = (typeof NODE_SIZES)[number];
/** The person's `size` action; `auto` clears it, like `unpin` (api.md 16). `xl` is the person's only: an agent's
 * suggestion stays `NODE_SIZES`. */
export const ACT_SIZES = [...NODE_SIZES, 'xl', 'auto'] as const;
export type ActSize = (typeof ACT_SIZES)[number];
/** A width a card is drawn at: the agent's three, or the person's XL. */
export type TierSize = Exclude<ActSize, 'auto'>;
/** The person's `direction` act (api.md 189): `across`, `down`, or `auto`, which gives back the agent's. */
export const ACT_DIRECTIONS = [...DIRECTIONS, 'auto'] as const;
export type ActDirection = (typeof ACT_DIRECTIONS)[number];
/** What the agent was given with an `ask` (api.md 188): the node, the board, or the board's own chat session. The
 * ledger records the fact, so which one the board gives can change without a format change. */
export const ASK_CONTEXTS = ['node', 'board', 'session'] as const;
export type AskContext = (typeof ASK_CONTEXTS)[number];
/** What a person's note asks for: a `comment`, or more context (api.md 59). */
export const NOTE_KINDS = ['comment', 'context'] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

/** Stamped by the server on every event. `agent` names the caller, an agent id from `join` (D-027); an agent's line
 * with none was drawn in format 2, before agents had ids, and makes no creator (review V3). `person` is written only
 * once a board has more than one person (D-018), so a single-person agent never sees it. */
interface Base {
  v: typeof LEDGER_FORMAT;
  seq: number;
  at: string;
  by: 'person' | 'agent';
  agent?: string;
  person?: string;
}

/** On every agent-written event but `join`: the agent's retry key (api.md 13, 29). */
interface Keyed { key?: string }

/** Why a node line or a sent node may not name `item` (api.md 118); the node schema's `noItem` says the same and a
 * test checks they agree. */
export const ITEM_REMOVED = formatLedgerWords.itemIsGoneTheKind
  + formatLedgerWords.aQuestionDecisionOrAction;

/** Why a line or a sent item may not name mode `list` (api.md 129); the common schema's `notList` says the same and
 * a test checks they agree. */
export const LIST_RENAMED = formatLedgerWords.listIsNowColumnTop
  + formatLedgerWords.rowRunsLeftToRight;

/** What the agent says about a node. Its `kind` decides whether it asks for an answer
 * (`NODE_TYPES`, api.md 118). */
export interface NodeBody {
  region: string;
  kind: Kind;
  title: string;
  body?: string;
  lane?: string;
  tags?: string[];
  emphasis?: boolean;
  /** The agent's suggestion; the person's `size` action wins (api.md 17). Never on an app card. */
  size?: NodeSize;
  /** On an app card only, and always there: which app, and its panel size (api.md 150). */
  app?: AppRef;
  /** A built-in icon or one of the project's library, by name (api.md 184). */
  icon?: string;
  /** A palette name or a whole OKLCH hue angle (api.md 184). */
  tone?: Tone;
  /** Its date in one of the four stored forms (api.md 190, `timeline.ts`); never on an app card. */
  timeline?: string;
}

/** Handover written when an item is parked (D-020). */
export interface ParkBundle {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  sources?: string[];
}

/** A region as the ledger stores it: `center` is the centre card's identity (api.md 18). The
 * View's `Region` names it by node id, its board number as text, instead. */
export type LedgerRegion = Omit<Region, 'center'> & { center?: number };

/** `skin`: how the board looks, set by whoever makes it (api.md 183); a rename leaves it out and keeps the board's. */
export interface BoardEvent extends Base, Keyed { type: 'board'; board: string; title: string; summary?: string; skin?: Skin }
export interface RegionEvent extends Base, Keyed { type: 'region'; board: string; region: LedgerRegion }
/** A new version of card `id`. The server assigns `id` (per project, never reused) and `ver`;
 * the card's board number follows from the order its board's cards were first drawn (api.md 125). */
export interface NodeEvent extends Base, Keyed { type: 'node'; board: string; id: number; ver: number; node: NodeBody }
/** `from` and `to` are card identities. */
export interface LinkEvent extends Base, Keyed { type: 'link' | 'unlink'; from: number; to: number; label?: string }
/** A person's action from the action registry. `id` = the card it is about; `ver` = the node
 * version they were looking at;
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
 * coordinates (api.md 71). `nodes` are card identities. A `bookmark`, `unbookmark`, `notes-hide` or `notes-show` names one card by `id`
 * and nothing else (api.md 128). A `widths` act sets a container's card widths (`board`, `region`,
 * `widths`), like `mode` (api.md 132). An `archive`, `restore`, `lock` or `unlock` names its `board` and nothing else
 * (api.md 135). An `app-allow` names its `app` and `hash`, an `app-revoke` its `app` (api.md 150). A `folders-allow` or `folders-revoke` names
 * nothing (api.md 215). */
export interface ActEvent extends Base {
  type: 'act'; action: ActionId; id?: number; ver?: number; text?: string; proposal?: number;
  x?: number; y?: number; board?: string; region?: string; mode?: Region['mode']; widths?: Widths;
  request?: number; holder?: string; size?: ActSize; note?: number; kind?: NoteKind; nodes?: number[];
  app?: string; hash?: string;
  /** A Send's answers were read through this line (api.md 169); left out, through the Send's own line. */
  head?: number;
  /** The board's skin, for `skin` (api.md 183). */
  skin?: Skin;
  /** For `ask` (api.md 188): the `seq` of each note of the person's it carried, and what the agent was given with it. */
  lines?: number[]; context?: AskContext;
  /** For `direction` (api.md 189): which way a flow runs, on one container (`region`) or with none the whole board. */
  direction?: ActDirection;
  /** On a `comment` an import wrote (point 617): the person's words, from the board the file came from; history. */
  from?: From;
}
/** Whose words an imported note or reply holds (point 617): the person's, or an agent's by its id and label on the ledger
 * they came from. The line's own `by` is who imported it. */
export interface From { by: 'person' | 'agent'; agent?: string; label?: string }
/** The person has seen version `ver` of card `id` (D-018), or has looked at `board` up to its
 * line `head` (api.md 87). A container's seen is the page's alone, never stored (D-054, point 308). */
export type SeenEvent = Base & { type: 'seen' } & ({ id: number; ver: number } | { board: string; head: number });
/** The agent answers an item without redrawing it. `to` = the `seq` of the act it answers. `from`: on a reply an import
 * wrote (point 617), the agent whose words they are; the person may write such a line. */
export interface ReplyEvent extends Base, Keyed { type: 'reply'; id: number; text: string; to?: number; from?: From }
/** The agent proposes a decision; only the person can make it (D-018). */
export interface ProposeEvent extends Base, Keyed {
  type: 'propose'; id: number; ver: number; action: 'ack' | 'drop'; reason: string; source?: string;
}
export interface ParkEvent extends Base, Keyed { type: 'park'; id: number; bundle: ParkBundle }
/** The agent takes cards off `board` for good (api.md 126): one card, or with `region` a whole
 * container and every card in it at this line; the person too, one or more cards or a
 * container (api.md 141). `cards` = their identities, which the server fills in, so a reader needs
 * no other fold to know what left. Retired cards keep their versions, notes and number; they leave
 * the board, its counts and every list. */
export interface RetireEvent extends Base, Keyed { type: 'retire'; board: string; cards: number[]; region?: string }
/** An agent joins the project (D-027). Its stamped `agent` is the new agent id. */
export interface JoinEvent extends Base { type: 'join'; label: string }
/** An agent asks the person for write access to one container, or with no `region` to the whole
 * board (api.md 15, 81). */
export interface GrantRequestEvent extends Base, Keyed {
  type: 'grant-request'; board: string; region?: string; reason: string;
}

/** Which drawing a name of the project's icon library means (api.md 185): the SHA-256 of its file in
 * `.visionboard/icons/`. Written by an agent (`add_icon`, or the server on a node's first use) or by the person
 * (accepting a changed drawing). It names no board and moves no board's head. */
export interface IconEvent extends Base, Keyed { type: 'icon'; name: string; hash: string }

export type LedgerEvent =
  | BoardEvent | RegionEvent | NodeEvent | LinkEvent | ActEvent
  | SeenEvent | ReplyEvent | ProposeEvent | ParkEvent | JoinEvent | GrantRequestEvent | RetireEvent | IconEvent;

/** Event types whose line names one card in `n` (the file) and `id` (code): ledger-line.ts. */
export const CARD_EVENTS: ReadonlySet<EventType> = new Set(['node', 'act', 'seen', 'reply', 'propose', 'park']);
