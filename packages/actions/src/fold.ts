// Folds the project ledger (D-017) into board state: every node's versions, the person's
// responses, replies, proposals, parks and what the person has seen. Pure: same events, same
// state. Events are assumed valid (readLedger in packages/format checks them first).
import type {
  ActEvent, ActionId, LedgerEvent, Mode, NodeBody, ParkBundle, ProposeEvent, Region, View, ViewNode,
} from '../../format/src/index.ts';
import { FORMAT_VERSION } from '../../format/src/index.ts';
import type { ItemStatus } from './registry.ts';
import { ACTIONS } from './registry.ts';

export interface ItemNote { kind: 'comment' | 'context'; text: string; at: string }
export interface ItemState { status: ItemStatus; notes: ItemNote[] }

/** The person's responses for one board, keyed by node id (`String(n)`), as the page reads it. */
export interface BoardState {
  items: Map<string, ItemState>;
  pins: Map<string, { x: number; y: number }>;
  modes: Map<string, Mode>;
}

export interface NodeVersion extends NodeBody { ver: number; at: string; agent?: string }
export interface LedgerNode { n: number; board: string; versions: NodeVersion[] }
export interface LedgerBoard { id: string; title: string; summary?: string; regions: Region[] }
export interface LedgerLink { from: number; to: number; label?: string }
export interface LedgerReply { seq: number; at: string; text: string; to?: number; agent?: string }
export interface Proposal {
  seq: number; at: string; n: number; ver: number; action: ProposeEvent['action'];
  reason: string; source?: string; agent?: string;
  /** `seq` of the person's act that accepted it. */
  decidedBy?: number;
}

export interface LedgerState {
  seq: number;
  boards: Map<string, LedgerBoard>;
  /** n -> its versions; the latest is the last. */
  nodes: Map<number, LedgerNode>;
  /** Keyed "from>to". */
  links: Map<string, LedgerLink>;
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
  seq: 0, boards: new Map(), nodes: new Map(), links: new Map(), items: new Map(),
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

/** Apply one valid event to `s`. */
export function applyEvent(s: LedgerState, e: LedgerEvent): void {
  s.seq = e.seq;
  switch (e.type) {
    case 'board':
      s.boards.set(e.board, { id: e.board, title: e.title, ...(e.summary && { summary: e.summary }), regions: [] });
      break;
    case 'region': {
      const regions = s.boards.get(e.board)?.regions;
      const i = regions?.findIndex((r) => r.id === e.region.id) ?? -1;
      if (regions && i >= 0) regions[i] = e.region;
      else regions?.push(e.region);
      break;
    }
    case 'node': {
      const node = s.nodes.get(e.n) ?? { n: e.n, board: e.board, versions: [] };
      node.versions.push({ ...e.node, ver: e.ver, at: e.at, ...(e.agent && { agent: e.agent }) });
      s.nodes.set(e.n, node);
      break;
    }
    case 'link': s.links.set(`${e.from}>${e.to}`, { from: e.from, to: e.to, ...(e.label && { label: e.label }) }); break;
    case 'unlink': s.links.delete(`${e.from}>${e.to}`); break;
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

/** The nodes of one board, in the order they were first drawn. */
const nodesOf = (s: LedgerState, board: string) => [...s.nodes.values()].filter((x) => x.board === board);

/** The latest version of every node. */
export const latest = (node: LedgerNode): NodeVersion => node.versions[node.versions.length - 1]!;

/** One board as the `View` the layout engine and the page read. Node id = `String(n)`; `n` is
 * set only on items (latest version has `item: true`). `version` = the ledger position. */
export function boardView(s: LedgerState, board: string): View {
  const b = s.boards.get(board);
  if (!b) throw new Error(`unknown board "${board}"`);
  const nodes = nodesOf(s, board);
  const ids = new Set(nodes.map((x) => x.n));
  return {
    format: FORMAT_VERSION, session: b.id, version: s.seq, title: b.title,
    ...(b.summary && { summary: b.summary }),
    regions: b.regions.map(({ center, ...r }) => ({ ...r, ...(center !== undefined && { center: String(center) }) })),
    nodes: nodes.map((x) => viewNode(x.n, latest(x))),
    links: [...s.links.values()].filter((l) => ids.has(l.from) && ids.has(l.to))
      .map((l) => ({ from: String(l.from), to: String(l.to), ...(l.label && { label: l.label }) })),
  };
}

function viewNode(n: number, v: NodeVersion): ViewNode {
  const { ver: _ver, at: _at, agent: _agent, item, ...body } = v;
  return { id: String(n), ...body, ...(item && { n }) };
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
