// Folds the project ledger (D-017) into board state: what the agent drew (folded by
// `applyDrawn` in packages/format, which also gives `boardView`), plus the person's responses,
// replies, proposals, parks and what the person has seen. Pure: same events, same state.
// Events are assumed valid (readLedger in packages/format checks them first).
import type {
  ActEvent, ActionId, DrawnState, LedgerEvent, Mode, ParkBundle, ProposeEvent, View,
} from '../../format/src/index.ts';
import { applyDrawn, emptyDrawn, nodesOf } from '../../format/src/index.ts';
import type { ItemStatus } from './registry.ts';
import { ACTIONS, DECIDED } from './registry.ts';

export interface ItemNote { kind: 'comment' | 'context'; text: string; at: string }
export interface ItemState { status: ItemStatus; notes: ItemNote[] }

/** The person's responses for one board, keyed by node id (`String(n)`), as the page reads it. */
export interface BoardState {
  items: Map<string, ItemState>;
  pins: Map<string, { x: number; y: number }>;
  modes: Map<string, Mode>;
}

export interface LedgerReply { seq: number; at: string; text: string; to?: number; agent?: string }
export interface Proposal {
  seq: number; at: string; n: number; ver: number; action: ProposeEvent['action'];
  reason: string; source?: string; agent?: string;
  /** `seq` of the person's act that accepted it. */
  decidedBy?: number;
}

/** What was drawn (DrawnState, from packages/format) plus the person's side. */
export interface LedgerState extends DrawnState {
  items: Map<number, ItemState>;
  replies: Map<number, LedgerReply[]>;
  pins: Map<number, { x: number; y: number }>;
  /** board -> region -> the person's layout choice. */
  modes: Map<string, Map<string, Mode>>;
  /** n -> latest version the person has seen. */
  seen: Map<number, number>;
  /** propose `seq` -> proposal. */
  proposals: Map<number, Proposal>;
  parks: Map<number, ParkBundle>;
}

export const emptyState = (): LedgerState => ({
  ...emptyDrawn(), items: new Map(),
  replies: new Map(), pins: new Map(), modes: new Map(), seen: new Map(),
  proposals: new Map(), parks: new Map(),
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

/** Apply one valid event to `s`: the drawn part in format, then the person's side here. */
export function applyEvent(s: LedgerState, e: LedgerEvent): void {
  applyDrawn(s, e);
  switch (e.type) {
    case 'act': applyAct(s, e); break;
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
    case 'park': s.parks.set(e.n, e.bundle); break;
  }
}

function applyAct(s: LedgerState, e: ActEvent): void {
  if (e.action === 'mode') {
    const regions = s.modes.get(e.board!) ?? new Map<string, Mode>();
    s.modes.set(e.board!, regions.set(e.region!, e.mode!));
  } else if (e.action === 'pin') s.pins.set(e.n!, { x: e.x!, y: e.y! });
  else if (e.action === 'unpin') s.pins.delete(e.n!);
  else {
    s.items.set(e.n!, applyItem(s.items.get(e.n!), e.action, e.text, e.at));
    const prop = e.proposal === undefined ? undefined : s.proposals.get(e.proposal);
    if (prop) prop.decidedBy = e.seq;
  }
}

/** The person's responses on one board, keyed like `boardView` (`String(n)`). */
export function boardState(s: LedgerState, board: string): BoardState {
  const out: BoardState = { items: new Map(), pins: new Map(), modes: new Map(s.modes.get(board)) };
  for (const { n } of nodesOf(s, board)) {
    const item = s.items.get(n);
    const pin = s.pins.get(n);
    if (item) out.items.set(String(n), item);
    if (pin) out.pins.set(String(n), pin);
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
