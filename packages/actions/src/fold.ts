// Folds the project ledger (D-017) into board state: what the agent drew (folded by
// `applyDrawn` in packages/format, which also gives `boardView`), the container index (folded by
// `indexEvent` in packages/format: agents, creators, holders, grant requests), plus the person's
// responses (status and notes: notes.ts), replies, proposals, parks, sizes, Sends and what the
// person has seen, and each agent's retry keys. Pure: same events, same state. Events are
// assumed valid (readLedger in packages/format checks them first).
import type {
  ActEvent, DrawnState, LedgerEvent, LedgerIndex, Mode, NodeSize, ParkBundle, ProposeEvent, View,
} from '../../format/src/index.ts';
import { applyDrawn, emptyDrawn, emptyIndex, indexEvent, nodesOf } from '../../format/src/index.ts';
import type { ItemStatus } from './registry.ts';
import { DECIDED } from './registry.ts';
import type { Ask, ItemLog, ItemNote, ItemState } from './notes.ts';
import { askOf, askVer, cardsOf, foldNoteAct, itemOf, latestAsk } from './notes.ts';

export type { ItemNote, ItemState } from './notes.ts';

/** The person's responses for one board, keyed by node id (`String(n)`), as the page reads it. */
export interface BoardState {
  items: Map<string, ItemState>;
  pins: Map<string, { x: number; y: number }>;
  modes: Map<string, Mode>;
  /** The person's card size picks (D-030); a node with none follows the agent or the auto tier. */
  sizes: Map<string, NodeSize>;
}

export interface LedgerReply { seq: number; at: string; text: string; to?: number; agent?: string }
export interface Proposal {
  seq: number; at: string; n: number; ver: number; action: ProposeEvent['action'];
  reason: string; source?: string; agent?: string;
  /** `seq` of the person's act that accepted it. */
  decidedBy?: number;
}

/** What the pending rules need per node (api.md 36): the person's latest comment or "needs
 * context" (its `seq` and the version it was made on), the latest "later", the latest park. */
export interface Marks {
  ask?: { kind: 'comment' | 'context'; seq: number; ver: number };
  later?: number;
  park?: number;
}

/** A kept grant request's words: why the agent asked, and the person's note if refused. */
export interface GrantNote { reason: string; at: string; text?: string }

/** What was drawn (DrawnState, from packages/format) plus the person's side. */
export interface LedgerState extends DrawnState {
  /** The container index, folded by packages/format (`indexEvent`), never folded again here. */
  index: LedgerIndex;
  /** Agent id -> the label it joined with. */
  agents: Map<string, string>;
  /** `grant-request` seq -> its words. The ledger refuses a second open request from the same
   * agent for the same container (api.md 26), so every request is kept. */
  grantNotes: Map<number, GrantNote>;
  items: Map<number, ItemState>;
  replies: Map<number, LedgerReply[]>;
  pins: Map<number, { x: number; y: number }>;
  /** n -> the person's size pick; `auto` deletes it (api.md 16). */
  sizes: Map<number, NodeSize>;
  /** board -> region -> the person's layout choice. */
  modes: Map<string, Map<string, Mode>>;
  /** board -> `seq` of the person's latest Send. */
  lastSend: Map<string, number>;
  /** agent -> retry key -> `seq` of the event that carried it, across the project (api.md 29). */
  keys: Map<string, Map<string, number>>;
  /** n -> latest version the person has seen. */
  seen: Map<number, number>;
  /** propose `seq` -> proposal. */
  proposals: Map<number, Proposal>;
  parks: Map<number, ParkBundle>;
  marks: Map<number, Marks>;
  /** n -> the item's asks and decisions, from which `items` is worked out (notes.ts). */
  logs: Map<number, ItemLog>;
  /** `seq` of a `comment` or `context` act -> its ask, so `note-edit` and `note-remove` find it. */
  asks: Map<number, Ask>;
  /** Every person act, in order, for `responsesAfter`. */
  acts: ActEvent[];
}

export const emptyState = (): LedgerState => ({
  ...emptyDrawn(), index: emptyIndex(), agents: new Map(), grantNotes: new Map(), items: new Map(),
  replies: new Map(), pins: new Map(), sizes: new Map(), modes: new Map(), lastSend: new Map(),
  keys: new Map(), seen: new Map(), proposals: new Map(), parks: new Map(), marks: new Map(),
  logs: new Map(), asks: new Map(), acts: [],
});

/** Fold every event, in order, into the current state. */
export function foldLedger(events: readonly LedgerEvent[]): LedgerState {
  const s = emptyState();
  for (const e of events) applyEvent(s, e);
  return s;
}

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => { m.set(k, [...(m.get(k) ?? []), v]); };
const marksOf = (s: LedgerState, n: number): Marks => {
  const m = s.marks.get(n) ?? {};
  s.marks.set(n, m);
  return m;
};

/** Apply one valid event to `s`: the drawn part and the index in format, the rest here. */
export function applyEvent(s: LedgerState, e: LedgerEvent): void {
  applyDrawn(s, e);
  indexEvent(s.index, e);
  if ('key' in e && e.key !== undefined && e.agent !== undefined) {
    const keys = s.keys.get(e.agent) ?? new Map<string, number>();
    s.keys.set(e.agent, keys.set(e.key, e.seq));
  }
  switch (e.type) {
    case 'join': if (e.agent !== undefined) s.agents.set(e.agent, e.label); break;
    case 'grant-request': s.grantNotes.set(e.seq, { reason: e.reason, at: e.at }); break;
    case 'act': s.acts.push(e); applyAct(s, e); break;
    case 'seen': s.seen.set(e.n, Math.max(s.seen.get(e.n) ?? 0, e.ver)); break;
    case 'reply':
      push(s.replies, e.n, { seq: e.seq, at: e.at, text: e.text, ...(e.to !== undefined && { to: e.to }), ...(e.agent && { agent: e.agent }) });
      break;
    case 'propose':
      s.proposals.set(e.seq, {
        seq: e.seq, at: e.at, n: e.n, ver: e.ver, action: e.action, reason: e.reason,
        ...(e.source && { source: e.source }), ...(e.agent && { agent: e.agent }),
      });
      break;
    case 'park': s.parks.set(e.n, e.bundle); marksOf(s, e.n).park = e.seq; break;
  }
}

function applyAct(s: LedgerState, e: ActEvent): void {
  switch (e.action) {
    case 'mode': {
      const regions = s.modes.get(e.board!) ?? new Map<string, Mode>();
      s.modes.set(e.board!, regions.set(e.region!, e.mode!));
      break;
    }
    case 'pin': s.pins.set(e.n!, { x: e.x!, y: e.y! }); break;
    case 'unpin': s.pins.delete(e.n!); break;
    case 'size': if (e.size === 'auto') s.sizes.delete(e.n!); else s.sizes.set(e.n!, e.size!); break;
    case 'send': s.lastSend.set(e.board!, e.seq); break;
    case 'deny': {
      const note = s.grantNotes.get(e.request!);
      if (note && e.text) note.text = e.text;
      break;
    }
    case 'grant': case 'revoke': break; // holders live in the index
    default: applyItemAct(s, e);
  }
}

/** An act on one item: a decision, an ask (`comment`, `context`), or a change to a note. The
 * status, notes and owed ask of every card it touches (all the cards of a note on a group) are
 * worked out again from their logs (notes.ts). */
function applyItemAct(s: LedgerState, e: ActEvent): void {
  const ask = e.note === undefined ? undefined : s.asks.get(e.note);
  const logOf = (n: number): ItemLog => {
    const log = s.logs.get(n) ?? { asks: [], decisions: [] };
    s.logs.set(n, log);
    return log;
  };
  let cards = ask ? cardsOf(ask) : [e.n!];
  if (e.action === 'comment' || e.action === 'context') {
    const made = askOf(e, (n) => s.nodes.get(n)?.versions.at(-1)?.ver ?? 0);
    cards = cardsOf(made);
    for (const n of cards) logOf(n).asks.push(made);
    s.asks.set(e.seq, made);
  } else if (ask) foldNoteAct(ask, e);
  else logOf(e.n!).decisions.push({ seq: e.seq, action: e.action });
  for (const n of cards) restate(s, n, logOf(n));
  if (e.action === 'later') marksOf(s, e.n!).later = e.seq;
  const prop = e.proposal === undefined ? undefined : s.proposals.get(e.proposal);
  if (prop) prop.decidedBy = e.seq;
}

/** Card `n`'s status, notes and owed ask, from its log. */
function restate(s: LedgerState, n: number, log: ItemLog): void {
  s.items.set(n, itemOf(log));
  const latest = latestAsk(log);
  const m = marksOf(s, n);
  if (latest) m.ask = { kind: latest.kind, seq: latest.seq, ver: askVer(latest, n) };
  else delete m.ask;
}

/** Whether a Send on `board` came after the act `seq` (fold.ts `lastSend`): its note is history. */
export const sentAfter = (s: LedgerState, board: string, seq: number): boolean => (s.lastSend.get(board) ?? 0) > seq;

/** An item's notes as the reads show them: `sent` on each one a Send came after. */
export function sentNotes(s: LedgerState, board: string, notes: readonly ItemNote[]): ItemNote[] {
  return notes.map((x) => ({ ...x, ...(sentAfter(s, board, x.seq) && { sent: true as const }) }));
}

/** The person's responses on one board, keyed like `boardView` (`String(n)`). */
export function boardState(s: LedgerState, board: string): BoardState {
  const out: BoardState = { items: new Map(), pins: new Map(), modes: new Map(s.modes.get(board)), sizes: new Map() };
  for (const { n } of nodesOf(s, board)) {
    const item = s.items.get(n);
    const pin = s.pins.get(n);
    const size = s.sizes.get(n);
    if (item) out.items.set(String(n), { status: item.status, notes: sentNotes(s, board, item.notes) });
    if (pin) out.pins.set(String(n), pin);
    if (size) out.sizes.set(String(n), size);
  }
  return out;
}

/** One item's status on a board; an item nobody has answered is open. */
export const statusOf = (s: BoardState, id: string): ItemStatus => s.items.get(id)?.status ?? 'open';

/** How many of a board's items are decided, saved for later, and still open. */
export function counts(view: View, s: BoardState) {
  const items = view.nodes.filter((n) => n.n !== undefined);
  const st = items.map((n) => statusOf(s, n.id));
  return {
    total: items.length,
    decided: st.filter((x) => DECIDED.has(x)).length,
    later: st.filter((x) => x === 'later').length,
    open: st.filter((x) => !DECIDED.has(x) && x !== 'later').length,
  };
}
