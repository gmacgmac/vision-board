// Shape checks for one ledger event, on its own. Contextual rules (does node 47 exist, is this
// the next version) are in ledger-index.ts. The API runs both on every streamed event (D-019).
import { EVENT_TYPES, LEDGER_FORMAT, AGENT_EVENTS, PERSON_EVENTS } from './ledger.ts';
import { ACTION_IDS } from './transcript.ts';
import { FORBIDDEN_KEYS, ID_PATTERN, KINDS, MODES } from './view.ts';

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isId = (v: unknown) => isStr(v) && ID_PATTERN.test(v);
const isNum = (v: unknown) => Number.isInteger(v) && (v as number) >= 1;

/** Longest note, reply or reason a person or agent may write. */
export const MAX_TEXT = 4000;

/** Every shape problem in one event. Empty means well formed. */
export function eventProblems(input: unknown): string[] {
  if (!isRec(input)) return ['event: must be an object'];
  const e = input;
  const p: string[] = [];
  if (e.v !== LEDGER_FORMAT) p.push(`v: must be ${LEDGER_FORMAT}`);
  if (!isNum(e.seq)) p.push('seq: integer >= 1');
  if (!isStr(e.at) || Number.isNaN(Date.parse(e.at))) p.push('at: ISO date');
  if (e.by !== 'person' && e.by !== 'agent') p.push('by: person or agent');
  if (e.agent !== undefined && !isStr(e.agent)) p.push('agent: name');
  if (!EVENT_TYPES.includes(e.type as never)) return [...p, `type: one of ${EVENT_TYPES.join(', ')}`];
  const type = e.type as (typeof EVENT_TYPES)[number];
  if (AGENT_EVENTS.has(type) && e.by !== 'agent') p.push(`${type}: written by an agent`);
  if (PERSON_EVENTS.has(type) && e.by !== 'person') p.push(`${type}: written by a person`);
  for (const t of [e.text, e.reason]) if (typeof t === 'string' && t.length > MAX_TEXT)
    p.push(`text: up to ${MAX_TEXT} characters`);
  CHECKS[type](e, p);
  return p;
}

const need = (p: string[], ok: boolean, msg: string) => { if (!ok) p.push(msg); };

const CHECKS: Record<(typeof EVENT_TYPES)[number], (e: Rec, p: string[]) => void> = {
  board: (e, p) => { need(p, isId(e.board), 'board: invalid id'); need(p, isStr(e.title), 'title: required'); },
  region: (e, p) => {
    need(p, isId(e.board), 'board: invalid id');
    const r = e.region;
    if (!isRec(r)) return void p.push('region: must be an object');
    need(p, isId(r.id), 'region.id: invalid id');
    need(p, isStr(r.title), 'region.title: required');
    need(p, MODES.includes(r.mode as never), `region.mode: one of ${MODES.join(', ')}`);
    if (r.mode === 'lanes') need(p, Array.isArray(r.lanes) && r.lanes.length > 0, 'region.lanes: required for lanes mode');
  },
  node: (e, p) => {
    need(p, isId(e.board), 'board: invalid id');
    need(p, isNum(e.n), 'n: integer >= 1');
    need(p, isNum(e.ver), 'ver: integer >= 1');
    const b = e.node;
    if (!isRec(b)) return void p.push('node: must be an object');
    for (const k of FORBIDDEN_KEYS) if (k in b) p.push(`node.${k}: no coordinates; the engine places nodes`);
    need(p, isId(b.region), 'node.region: invalid id');
    need(p, KINDS.includes(b.kind as never), `node.kind: one of ${KINDS.join(', ')}`);
    need(p, isStr(b.title), 'node.title: required');
  },
  link: (e, p) => { need(p, isNum(e.from), 'from: node number'); need(p, isNum(e.to), 'to: node number'); },
  unlink: (e, p) => { need(p, isNum(e.from), 'from: node number'); need(p, isNum(e.to), 'to: node number'); },
  act: (e, p) => {
    need(p, ACTION_IDS.includes(e.action as never), `action: one of ${ACTION_IDS.join(', ')}`);
    if (e.action === 'mode') {
      need(p, isId(e.board) && isId(e.region), 'mode: board and region required');
      need(p, MODES.includes(e.mode as never), `mode: one of ${MODES.join(', ')}`);
      return;
    }
    need(p, isNum(e.n), 'n: node number');
    if (e.action !== 'pin' && e.action !== 'unpin') need(p, isNum(e.ver), 'ver: the version acted on');
    if (e.action === 'pin') need(p, Number.isFinite(e.x) && Number.isFinite(e.y), 'pin: x and y numbers');
    if (e.action === 'comment') need(p, isStr(e.text), 'text: required');
    if (e.proposal !== undefined) need(p, isNum(e.proposal), 'proposal: seq of a propose event');
  },
  seen: (e, p) => { need(p, isNum(e.n), 'n: node number'); need(p, isNum(e.ver), 'ver: integer >= 1'); },
  reply: (e, p) => { need(p, isNum(e.n), 'n: node number'); need(p, isStr(e.text), 'text: required'); },
  propose: (e, p) => {
    need(p, isNum(e.n) && isNum(e.ver), 'n and ver: required');
    need(p, e.action === 'ack' || e.action === 'drop', 'action: ack or drop');
    need(p, isStr(e.reason), 'reason: required');
  },
  park: (e, p) => {
    need(p, isNum(e.n), 'n: node number');
    const b = e.bundle;
    if (!isRec(b)) return void p.push('bundle: must be an object');
    for (const k of ['situation', 'background', 'assessment', 'recommendation'])
      need(p, isStr(b[k]), `bundle.${k}: required`);
  },
};
