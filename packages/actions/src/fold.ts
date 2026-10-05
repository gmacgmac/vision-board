// Folds the project ledger (D-017) into board state: what the agent drew (folded by
// `applyDrawn` in packages/format, which also gives `boardView`), the container index (folded by
// `indexEvent` in packages/format: agents, creators, holders, grant requests), plus the person's
// responses, replies, proposals, parks, sizes, Sends and what the person has seen, and each
// agent's retry keys. Pure: same events, same state. Events are assumed valid (readLedger in
// packages/format checks them first).
import type {
  ActEvent, ActionId, DrawnState, LedgerEvent, LedgerIndex, Mode, NodeSize, ParkBundle, ProposeEvent, View,
} from '../../format/src/index.ts';
import { applyDrawn, emptyDrawn, emptyIndex, indexEvent, nodesOf } from '../../format/src/index.ts';
import type { ItemStatus } from './registry.ts';
import { ACTIONS, DECIDED } from './registry.ts';

export interface ItemNote { kind: 'comment' | 'context'; text: string; at: string }
export interface ItemState { status: ItemStatus; notes: ItemNote[] }

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
  /** `grant-request` seq -> its words. Only requests the fold keeps: a second open request from
   * the same agent for the same container is dropped (api.md 26). */
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
  /** Every person act, in order, for `responsesAfter`. */
  acts: ActEvent[];
}

export const emptyState = (): LedgerState => ({
  ...emptyDrawn(), index: emptyIndex(), agents: new Map(), grantNotes: new Map(), items: new Map(),
  replies: new Map(), pins: new Map(), sizes: new Map(), modes: new Map(), lastSend: new Map(),
  keys: new Map(), seen: new Map(), proposals: new Map(), parks: new Map(), marks: new Map(), acts: [],
});

/** Status and note rules for one item action. Last action wins; notes accumulate. */
export function applyItem(
  prev: ItemState | undefined, action: ActionId, text: string | undefined, at: string,
): ItemState {
  const item = prev ?? { status: 'open' as ItemStatus, notes: [] };
  const def = ACTIONS[action];
  if ((action === 'comment' || action === 'context') && text?.trim())
    item.notes.push({ kind: action, text: text.trim(), at });
  if (def.status) item.status = def.status;
  else if (action === 'comment' && item.status === 'open') item.status = 'commented';
  return item;
}

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
    case 'grant-request': if (!repeatsOpen(s, e.seq)) s.grantNotes.set(e.seq, { reason: e.reason, at: e.at }); break;
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

/** True when request `seq` repeats a kept, unanswered request from the same agent for the same
 * container (api.md 26): the fold keeps the first, so the person is asked once. */
function repeatsOpen(s: LedgerState, seq: number): boolean {
  const r = s.index.requests.get(seq);
  if (!r) return false;
  for (const kept of s.grantNotes.keys()) {
    const k = s.index.requests.get(kept);
    if (k && !k.answer && k.agent === r.agent && k.board === r.board && k.region === r.region) return true;
  }
  return false;
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

function applyItemAct(s: LedgerState, e: ActEvent): void {
  const n = e.n!;
  s.items.set(n, applyItem(s.items.get(n), e.action, e.text, e.at));
  if (e.action === 'comment' || e.action === 'context') {
    const ver = e.ver ?? s.nodes.get(n)?.versions.at(-1)?.ver ?? 0;
    marksOf(s, n).ask = { kind: e.action, seq: e.seq, ver };
  }
  if (e.action === 'later') marksOf(s, n).later = e.seq;
  const prop = e.proposal === undefined ? undefined : s.proposals.get(e.proposal);
  if (prop) prop.decidedBy = e.seq;
}

/** The person's responses on one board, keyed like `boardView` (`String(n)`). */
export function boardState(s: LedgerState, board: string): BoardState {
  const out: BoardState = { items: new Map(), pins: new Map(), modes: new Map(s.modes.get(board)), sizes: new Map() };
  for (const { n } of nodesOf(s, board)) {
    const item = s.items.get(n);
    const pin = s.pins.get(n);
    const size = s.sizes.get(n);
    if (item) out.items.set(String(n), item);
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
