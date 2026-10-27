// Shape checks for one ledger event, on its own. Contextual rules (does node 47 exist, is this
// the next version) are in ledger-index.ts. This is the hand-written twin of the JSON Schema in
// packages/format/schema/ (the one source, rule 6): a test runs both over every fixture and a
// table of broken lines and they must give the same verdict, not the same words (api.md 9).
import type { ActionId, EventType } from './ledger.ts';
import {
  ACTION_IDS, ACT_SIZES, AGENT_EVENTS, BOARD_MARKS, CARD_MARKS, CONTAINER_ACTIONS, EVENT_TYPES, ITEM_REMOVED, LEDGER_FORMATS, LIST_RENAMED,
  NODE_SIZES, NOTE_KINDS, PERSON_EVENTS, PERSON_TOO,
} from './ledger.ts';
import { FORBIDDEN_KEYS, ID_PATTERN, KINDS, MODES, RENAMED_MODES, WIDTHS } from './view.ts';
import { appActRules, appHashProblems, appNodeRules, appRefProblems } from './app-shape.ts';
import * as formatLedgerWords from './words/format-ledger.ts';
import * as formatCommonWords from './words/format-common.ts';
import { isRecord } from './records.ts';

/** Every mode a stored line may name: today's, and the old names older lines carry (api.md 129). */
const LINE_MODES = [...MODES, ...Object.keys(RENAMED_MODES)];

/** An agent id, as `join` hands it out (api.md 10, D-027). */
export const AGENT_ID_PATTERN = /^a-[a-z0-9]{8}$/;
/** RFC 3339 UTC, by pattern, the same one the schema uses (api.md 10). */
export const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const NON_BLANK = /\S/u;

/** Longest text per field, in code points (api.md 10). The schema holds the same numbers; a test
 * checks they agree. */
export const LIMITS = {
  title: 200, regionTitle: 80, body: 8000, text: 4000, summary: 2000, linkLabel: 80,
  agentLabel: 80, tag: 40, tags: 12, lane: 40, lanes: 12, columns: 12, source: 500, sources: 20,
  key: 64, person: 80, nodes: 500,
} as const;

/** Longest note, reply or reason a person or agent may write. */
export const MAX_TEXT = LIMITS.text;

/** Length as the schema counts it: code points, so an emoji is one (api.md 10). */
export const codePoints = (s: string): number => [...s].length;

type Rec = Record<string, unknown>;
type Check = (v: unknown, f: string, p: string[]) => void;
/** One object's fields: `req` must be present; every field present is checked; any other key is
 * refused (api.md 7). */
interface Shape { req: readonly string[]; fields: Record<string, Check> }

const isText = (v: unknown): v is string => typeof v === 'string' && NON_BLANK.test(v);

const text = (max?: number): Check => (v, f, p) => {
  if (!isText(v)) p.push(formatLedgerWords.required(f));
  else if (max !== undefined && codePoints(v) > max) p.push(formatLedgerWords.upToCharacters(f, max));
};
const id: Check = (v, f, p) => { if (!isText(v) || !ID_PATTERN.test(v)) p.push(formatLedgerWords.invalidId(f)); };
const agentId: Check = (v, f, p) => {
  if (!isText(v) || !AGENT_ID_PATTERN.test(v)) p.push(formatLedgerWords.anAgentIdAAnd(f));
};
const int = (msg = 'integer >= 1', max?: number): Check => (v, f, p) => {
  if (!Number.isInteger(v) || (v as number) < 1 || (max !== undefined && (v as number) > max)) p.push(`${f}: ${msg}`);
};
const oneOf = (values: readonly unknown[]): Check => (v, f, p) => {
  if (!values.includes(v)) p.push(formatLedgerWords.oneOf(f, values.join(', ')));
};
const bool: Check = (v, f, p) => { if (typeof v !== 'boolean') p.push(formatLedgerWords.trueOrFalse(f)); };
const num: Check = (v, f, p) => { if (typeof v !== 'number' || !Number.isFinite(v)) p.push(formatLedgerWords.number(f)); };
const list = (item: Check, max: number): Check => (v, f, p) => {
  if (!Array.isArray(v)) return void p.push(formatLedgerWords.list(f));
  if (v.length > max) p.push(formatLedgerWords.upToEntries(f, max));
  v.forEach((x, i) => item(x, `${f}[${i}]`, p));
};
const obj = (shape: Shape, extra?: (o: Rec, f: string, p: string[]) => void): Check => (v, f, p) => {
  if (!isRecord(v)) return void p.push(formatCommonWords.mustBeAnObject(f));
  fieldProblems(v, shape, `${f}.`, p);
  extra?.(v, f, p);
};

/** Check `o` against `shape`; `prefix` names it in messages ("node."). */
function fieldProblems(o: Rec, shape: Shape, prefix: string, p: string[]): void {
  for (const k of Object.keys(o)) {
    if (shape.fields[k]) continue;
    p.push(prefix === 'node.' && FORBIDDEN_KEYS.includes(k)
      ? formatLedgerWords.nodeNoCoordinatesTheEngine(k) : formatLedgerWords.unknownField2(prefix, k));
  }
  for (const [k, check] of Object.entries(shape.fields))
    if (o[k] !== undefined || shape.req.includes(k)) check(o[k], `${prefix}${k}`, p);
}

const nodeNumber = int(formatLedgerWords.nodeNumber);
const key = text(LIMITS.key);
/** The cards a `retire` takes off its board (api.md 126): distinct node numbers, none or more. */
const cardList: Check = (v, f, p) => {
  list(nodeNumber, LIMITS.nodes)(v, f, p);
  if (Array.isArray(v) && new Set(v).size !== v.length) p.push(formatLedgerWords.eachCardOnce(f));
};
/** A group of cards (api.md 62, 66): two or more distinct node numbers. */
const nodeNumbers: Check = (v, f, p) => {
  list(nodeNumber, LIMITS.nodes)(v, f, p);
  if (!Array.isArray(v)) return;
  if (v.length < 2) p.push(formatLedgerWords.atLeast2NodeNumbers(f));
  if (new Set(v).size !== v.length) p.push(formatLedgerWords.eachNodeOnce(f));
};

const REGION: Shape = {
  req: ['id', 'title', 'mode'],
  fields: {
    id, title: text(LIMITS.regionTitle), mode: oneOf(LINE_MODES), lanes: list(text(LIMITS.lane), LIMITS.lanes),
    center: nodeNumber, columns: int(formatLedgerWords.wholeNumberFrom1To(LIMITS.columns), LIMITS.columns), widths: oneOf(WIDTHS),
  },
};
const lanesRule = (r: Rec, f: string, p: string[]) => {
  if (r.mode === 'lanes' && (r.lanes === undefined || (Array.isArray(r.lanes) && !r.lanes.length)))
    p.push(formatCommonWords.lanesRequiredForLanesMode(f));
};

const NODE: Shape = {
  req: ['region', 'kind', 'title'],
  fields: {
    region: id, kind: oneOf(KINDS), title: text(LIMITS.title), body: text(LIMITS.body), item: bool,
    lane: text(LIMITS.lane), tags: list(text(LIMITS.tag), LIMITS.tags), emphasis: bool, size: oneOf(NODE_SIZES), app: appRefProblems,
  },
};

const BUNDLE: Shape = {
  req: ['situation', 'background', 'assessment', 'recommendation'],
  fields: {
    situation: text(LIMITS.text), background: text(LIMITS.text), assessment: text(LIMITS.text),
    recommendation: text(LIMITS.text), sources: list(text(LIMITS.source), LIMITS.sources),
  },
};

const link: Shape = { req: ['from', 'to'], fields: { from: nodeNumber, to: nodeNumber, label: text(LIMITS.linkLabel), key } };

/** Fields of each event type, besides the stamp and `type`. */
const SHAPES: Record<EventType, Shape> = {
  board: { req: ['board', 'title'], fields: { board: id, title: text(LIMITS.title), summary: text(LIMITS.summary), key } },
  region: { req: ['board', 'region'], fields: { board: id, region: obj(REGION, lanesRule), key } },
  node: { req: ['board', 'n', 'ver', 'node'], fields: { board: id, n: int(), ver: int(), node: obj(NODE), key } },
  link, unlink: link,
  act: {
    req: ['action'],
    fields: {
      action: oneOf(ACTION_IDS), n: nodeNumber, ver: int(formatLedgerWords.theVersionActedOn), text: text(LIMITS.text),
      proposal: int(formatLedgerWords.seqOfAProposeEvent), x: num, y: num, board: id, region: id, mode: oneOf(LINE_MODES),
      request: int(formatLedgerWords.seqOfAGrantRequest), holder: agentId, size: oneOf(ACT_SIZES),
      note: int(formatLedgerWords.seqOfTheCommentOr), kind: oneOf(NOTE_KINDS),
      nodes: nodeNumbers, widths: oneOf(WIDTHS), app: id, hash: appHashProblems,
    },
  },
  seen: { req: [], fields: { n: nodeNumber, ver: int(), board: id, head: int(formatLedgerWords.seqOfALine) } },
  reply: { req: ['n', 'text'], fields: { n: nodeNumber, text: text(LIMITS.text), to: int(formatLedgerWords.seqOfTheActIt), key } },
  propose: {
    req: ['n', 'ver', 'action', 'reason'],
    fields: { n: nodeNumber, ver: int(), action: oneOf(['ack', 'drop']), reason: text(LIMITS.text), source: text(LIMITS.source), key },
  },
  park: { req: ['n', 'bundle'], fields: { n: nodeNumber, bundle: obj(BUNDLE), key } },
  join: { req: ['label'], fields: { label: text(LIMITS.agentLabel) } },
  'grant-request': { req: ['board', 'reason'], fields: { board: id, region: id, reason: text(LIMITS.text), key } },
  retire: { req: ['board', 'cards'], fields: { board: id, cards: cardList, region: id, key } },
};

/** Actions on one node version; actions on a node's place or size; actions that name no node. */
const ON_VERSION = new Set(['ack', 'drop', 'comment', 'context', 'later', 'reopen']);
const ON_NODE = new Set(['pin', 'unpin', 'size', 'note-edit', 'note-remove', 'move', 'reject', 'flag', 'unflag', 'notes-hide', 'notes-show']);
/** Acts that change a person's note, named by the `seq` of the act that made it (api.md 58-61). */
const ON_NOTE = new Set(['note-edit', 'note-remove']);
const NO_NODE = new Set(['grant', 'deny', 'revoke', 'send']);

/** Actions that may name a group of cards with `nodes` in place of `n` and `ver`: a note on a
 * group (api.md 62) and a group move (api.md 66). */
const ON_GROUP = new Set(['comment', 'context', 'move']);
/** Of those, the notes: a note on a group always has words. */
const GROUP_NOTE = new Set(['comment', 'context']);

/** A note on, or a place for, a whole container (api.md 71): board + region, no card named. */
function containerRules(e: Rec, p: string[]): void {
  if (e.board === undefined) p.push(formatLedgerWords.boardANoteOnOr);
  for (const f of ['n', 'ver', 'nodes']) if (e[f] !== undefined) p.push(formatLedgerWords.aContainerIsNamedBy(f, f));
  if ((e.action === 'comment' || e.action === 'context') && e.text === undefined) p.push(formatLedgerWords.textRequiredOnANote);
}

/** An act on cards: one card (`n`, with `ver` for a decision or an ask) or a group (`nodes`). */
function nodeRules(e: Rec, group: boolean, p: string[]): void {
  const a = e.action as string;
  const has = (f: string) => e[f] !== undefined;
  if (group && !ON_GROUP.has(a)) p.push(formatLedgerWords.nodesOnlyACommentA);
  if (group && ON_GROUP.has(a)) {
    if (has('n')) p.push(formatLedgerWords.nAGroupNamesIts);
    if (has('ver')) p.push(formatLedgerWords.verAGroupNamesNo);
    if (GROUP_NOTE.has(a) && !has('text')) p.push(formatLedgerWords.textRequiredOnANoteOn);
  } else {
    if ((ON_VERSION.has(a) || ON_NODE.has(a)) && !has('n')) p.push(formatLedgerWords.nNodeNumber);
    if (ON_VERSION.has(a) && !has('ver')) p.push(formatLedgerWords.verTheVersionActedOn);
  }
}

/** What each action needs beyond the field types (api.md 16; the schema's `if`/`then`). */
function actRules(e: Rec, p: string[]): void {
  const a = e.action as string;
  const has = (f: string) => e[f] !== undefined;
  const need = (f: string, msg: string) => { if (!has(f)) p.push(msg); };
  if (a === 'mode') {
    if (!has('board') || !has('region')) p.push(formatLedgerWords.modeBoardAndRegionRequired);
    need('mode', formatLedgerWords.modeOneOf(MODES.join(', ')));
  }
  // A container's card widths, like its mode (api.md 132).
  if (a === 'widths') {
    if (!has('board') || !has('region')) p.push(formatLedgerWords.widthsBoardAndRegionRequired);
    need('widths', formatLedgerWords.widthsOneOf(WIDTHS.join(', ')));
  }
  if (a === 'move') need('region', formatLedgerWords.regionTheContainerToMove);
  const group = has('nodes');
  if (CONTAINER_ACTIONS.has(a as ActionId) && has('region')) containerRules(e, p);
  else nodeRules(e, group, p);
  if (a === 'pin' && (!has('x') || !has('y'))) p.push('pin: x and y numbers');
  if (a === 'comment') need('text', 'text: required');
  if (a === 'grant' || a === 'deny') need('request', formatLedgerWords.requestTheSeqOfA(a));
  if (a === 'revoke') for (const f of ['holder', 'board']) need(f, formatLedgerWords.revokeRequired(f));
  if (a === 'size') need('size', formatLedgerWords.sizeOneOf(ACT_SIZES.join(', ')));
  if (a === 'send') need('board', formatLedgerWords.sendBoardRequired);
  if (ON_NOTE.has(a)) need('note', formatLedgerWords.noteTheSeqOfThe);
  if (a === 'note-edit') need('text', 'text: required');
  if (a === 'reject') need('proposal', formatLedgerWords.proposalTheSeqOfThe);
  if (NO_NODE.has(a) && has('n')) p.push(formatLedgerWords.nNamesNoNode(a));
  // The flag and the hidden notes mark one card, whatever its version (api.md 128, 156).
  if (CARD_MARKS.has(a as ActionId)) for (const f of ['ver', 'region']) if (has(f)) p.push(formatLedgerWords.aNamesOneCardWith(f, a));
  // Archive, restore, lock and unlock mark a whole board (api.md 135, 138).
  if (BOARD_MARKS.has(a as ActionId)) {
    need('board', formatLedgerWords.boardRequired(a));
    for (const f of ['n', 'ver', 'region', 'nodes']) if (has(f)) p.push(formatLedgerWords.namesItsBoardAndNothing(f, /^[aeiou]/.test(a) ? 'an' : 'a', a));
  }
  appActRules(e, p);
}

/** A `retire` names its cards, and with `region` the container they were in (api.md 126); without a
 * container it takes at least one card. */
function retireRules(e: Rec, p: string[]): void {
  if (e.region === undefined && Array.isArray(e.cards) && !e.cards.length) p.push(formatLedgerWords.cardsAtLeast1Card);
}

/** From v12 a line names no renamed mode (api.md 129). */
function modeRules(e: Rec, p: string[]): void {
  if ((e.v as number) < 12) return;
  const region = isRecord(e.region) ? e.region.mode : undefined;
  if (e.type === 'region' && typeof region === 'string' && region in RENAMED_MODES) p.push(formatLedgerWords.regionMode(LIST_RENAMED));
  if (e.type === 'act' && typeof e.mode === 'string' && e.mode in RENAMED_MODES) p.push(formatLedgerWords.mode(LIST_RENAMED));
}

/** A `seen` names one node version (`n`, `ver`) or one board up to a line (`board`, `head`), never
 * both (api.md 87). */
function seenRules(e: Rec, p: string[]): void {
  const node = e.n !== undefined || e.ver !== undefined;
  if (node && (e.board !== undefined || e.head !== undefined)) p.push(formatLedgerWords.seenANodeNAnd);
  else if (node || e.board === undefined) for (const f of ['n', 'ver']) { if (e[f] === undefined) p.push(formatLedgerWords.required(f)); }
  else if (e.head === undefined) p.push(formatLedgerWords.headRequiredTheBoardS);
}

const STAMP: Shape = {
  req: ['v', 'seq', 'at', 'by'],
  fields: {
    v: oneOf(LEDGER_FORMATS), seq: int(),
    at: (v, f, p) => { if (typeof v !== 'string' || !TIMESTAMP_PATTERN.test(v)) p.push(formatLedgerWords.uTCTimestampLike202610(f)); },
    by: oneOf(['person', 'agent']), agent: text(), person: text(LIMITS.person),
  },
};

/** Every shape problem in one event. Empty means well formed. */
export function eventProblems(input: unknown): string[] {
  if (!isRecord(input)) return ['event: must be an object'];
  const e = input;
  const p: string[] = [];
  const { agent, type, ...rest } = e;
  if (!EVENT_TYPES.includes(type as never)) {
    fieldProblems(pick(rest, STAMP), STAMP, '', p);
    return [...p, formatLedgerWords.typeOneOf(EVENT_TYPES.join(', '))];
  }
  const t = type as EventType;
  const shape = SHAPES[t];
  const fields = { ...STAMP.fields, ...shape.fields };
  fieldProblems(rest, { req: [...STAMP.req, ...shape.req], fields }, '', p);
  // From v3 the stamped agent is an agent id; on v2 any name (api.md 11).
  if (agent !== undefined) (e.v === 2 ? text() : agentId)(agent, 'agent', p);
  const personToo = e.by === 'person' && (e.v as number) >= (PERSON_TOO[t] ?? Infinity);
  if (AGENT_EVENTS.has(t) && e.by !== 'agent' && !personToo) p.push(formatLedgerWords.writtenByAnAgent(t));
  if (PERSON_EVENTS.has(t) && e.by !== 'person') p.push(formatLedgerWords.writtenByAPerson(t));
  if (t === 'join' && agent === undefined) p.push(formatLedgerWords.agentRequiredAJoinIs);
  if (t === 'act') actRules(e, p);
  if (t === 'seen') seenRules(e, p);
  if (t === 'retire') retireRules(e, p);
  modeRules(e, p);
  // From v11 the kind decides; `item` stays readable on older lines (api.md 118).
  if (t === 'node' && (e.v as number) >= 11 && isRecord(e.node) && e.node.item !== undefined) p.push(formatLedgerWords.nodeItem(ITEM_REMOVED));
  if (t === 'node' && isRecord(e.node)) appNodeRules(e.node, 'node', p);
  return p;
}

/** The keys of `o` that `shape` knows, so an unknown type reports only the stamp's problems. */
const pick = (o: Rec, shape: Shape): Rec =>
  Object.fromEntries(Object.entries(o).filter(([k]) => k in shape.fields));
