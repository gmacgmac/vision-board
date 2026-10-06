// The read views the API answers with (api.md Operations, 31-36): one node with its whole
// history, one container, the open items, and which board a ledger line belongs to. Pure reads
// of the folded ledger; the shapes are the response schemas in packages/format/schema/api/.
// Optional fields are left out when they do not apply (api.md 32).
import type { LedgerEvent, LedgerNode, LedgerRegion, NodeBody, NodeSize, ParkBundle } from '../../format/src/index.ts';
import { latest, nodesOf } from '../../format/src/index.ts';
import type { ItemNote, LedgerReply, LedgerState, Proposal } from './fold.ts';
import { sentNotes } from './fold.ts';
import type { Place } from './containers.ts';
import { containerNotes, containerPin, noteJson } from './containers.ts';
import { canWrite, creatorOf, grantRequests, holders } from './grants.ts';
import { movedFrom, regionOf } from './moves.ts';
import { pendingItems, unseenItems } from './pending.ts';
import type { ItemStatus } from './registry.ts';
import { DECIDED } from './registry.ts';

/** One version of a node: what the agent said, when, and who. */
export interface NodeVersionView { ver: number; at: string; agent?: string; node: NodeBody }

/** Everything known about one node (`show_node`, `show_container`). */
export interface NodeDetail {
  n: number;
  board: string;
  /** The container it is in now: the person's latest move, else its latest version's (api.md 68). */
  region: string;
  /** Where the agent has it, when the person put it somewhere else (3_FE_03 ruling 2). */
  moved_from?: string;
  /** Only for an item (its latest version has `item: true`). */
  status?: ItemStatus;
  /** The person's size pick; it wins over the agent's suggestion. */
  size?: NodeSize;
  /** The latest version the person has seen. */
  seen?: number;
  versions: NodeVersionView[];
  notes: ItemNote[];
  replies: LedgerReply[];
  proposals: Proposal[];
  park?: ParkBundle;
  /** Links from or to this node. */
  links: { from: number; to: number; label?: string }[];
}

/** One container: the region as stored, who holds it, every node it has held, the person's notes
 * on the whole container (oldest first, api.md 75) and, when placed, where (api.md 74). */
export interface ContainerDetail {
  board: string; region: LedgerRegion; holders: string[]; nodes: NodeDetail[]; notes: ItemNote[]; pin?: Place;
}

/** An unanswered grant request as the board page shows it (`get_board`): which container, why,
 * and the asking agent's id and the label it joined with. */
export interface AccessRequest { seq: number; region: string; reason: string; at: string; agent?: string; label?: string }

/** One holder of a container, with its label; `creator` marks the agent that made the region,
 * which the person cannot remove (api.md 23). */
export interface AccessHolder { agent: string; label: string; creator?: true }

/** Who may write where on one board: the open requests and each region's holders. Either is
 * left out when it is empty, so a board with no agents carries neither (api.md 32). */
export interface BoardAccess { requests?: AccessRequest[]; holders?: Record<string, AccessHolder[]> }

/** An item not yet decided (`list_open`, and `pending` on a write answer). */
export interface OpenItem {
  board: string; n: number; ver: number; region: string; moved_from?: string; kind: NodeBody['kind']; title: string;
  status: ItemStatus;
  pending?: 'comment' | 'context' | 'later';
  unseen?: true;
}

const versionView = ({ ver, at, agent, ...node }: LedgerNode['versions'][number]): NodeVersionView =>
  ({ ver, at, ...(agent !== undefined && { agent }), node });

/** Where node `n` is, and where the agent has it when the person moved it (api.md 68). */
const placeOf = (s: LedgerState, n: number) => {
  const from = movedFrom(s, n);
  return { region: regionOf(s, n)!, ...(from !== undefined && { moved_from: from }) };
};

/** Everything known about node `n`, or undefined when there is no such node. */
export function nodeDetail(s: LedgerState, n: number): NodeDetail | undefined {
  const node = s.nodes.get(n);
  if (!node) return undefined;
  const last = latest(node);
  const size = s.sizes.get(n);
  const seen = s.seen.get(n);
  const park = s.parks.get(n);
  return {
    n, board: node.board, ...placeOf(s, n),
    ...(last.item && { status: s.items.get(n)?.status ?? 'open' }),
    ...(size !== undefined && { size }),
    ...(seen !== undefined && { seen }),
    versions: node.versions.map(versionView),
    notes: sentNotes(s, node.board, s.items.get(n)?.notes ?? []),
    replies: [...(s.replies.get(n) ?? [])],
    proposals: [...s.proposals.values()].filter((p) => p.n === n),
    ...(park && { park }),
    links: [...s.links.values()].filter((l) => l.from === n || l.to === n).map((l) => ({ ...l })),
  };
}

/** The nodes linked to `n`, one hop, each in full (`show_node` with `linked=true`). */
export function linkedDetails(s: LedgerState, n: number): NodeDetail[] {
  const others = new Set<number>();
  for (const l of s.links.values()) {
    if (l.from === n) others.add(l.to);
    if (l.to === n) others.add(l.from);
  }
  others.delete(n);
  return [...others].sort((a, b) => a - b).map((x) => nodeDetail(s, x)).filter((d): d is NodeDetail => d !== undefined);
}

/** One container on `board`, or undefined when the board has no such region. A node belongs if
 * any of its versions was in the region, or the person put it there (api.md 68). */
export function containerDetail(s: LedgerState, board: string, region: string): ContainerDetail | undefined {
  const r = s.boards.get(board)?.regions.find((x) => x.id === region);
  if (!r) return undefined;
  const nodes = nodesOf(s, board).filter((x) => regionOf(s, x.n) === region || x.versions.some((v) => v.region === region));
  const pin = containerPin(s, board, region);
  return {
    board, region: { ...r }, holders: holders(s, board, region),
    nodes: nodes.map((x) => nodeDetail(s, x.n)!),
    notes: containerNotes(s, board, region).map(noteJson),
    ...(pin && { pin }),
  };
}

/** The open grant requests on `board`, oldest first, and each region's holders, creator first
 * (`get_board`, D-027). Labels come from each agent's `join`. */
export function boardAccess(s: LedgerState, board: string): BoardAccess {
  const label = (agent: string) => s.agents.get(agent) ?? agent;
  const requests: AccessRequest[] = grantRequests(s, board).filter((r) => !r.answer).map((r) => ({
    seq: r.seq, region: r.region, reason: r.reason, at: r.at,
    ...(r.agent !== undefined && { agent: r.agent, label: label(r.agent) }),
  }));
  const held: Record<string, AccessHolder[]> = {};
  for (const r of s.boards.get(board)?.regions ?? []) {
    const creator = creatorOf(s, board, r.id);
    const list = holders(s, board, r.id)
      .map((agent): AccessHolder => ({ agent, label: label(agent), ...(agent === creator && { creator: true as const }) }))
      .sort((a, b) => Number(b.creator ?? false) - Number(a.creator ?? false));
    if (list.length) held[r.id] = list;
  }
  return { ...(requests.length > 0 && { requests }), ...(Object.keys(held).length > 0 && { holders: held }) };
}

/** The items on `board` not yet decided, by number, with why each waits for the agent and
 * whether the person has a version still to see (api.md 36, D-018). With `agent`, only the items
 * it may answer: in a container it holds, or whose latest version it wrote (api.md 41). */
export function openItems(s: LedgerState, board: string, agent?: string): OpenItem[] {
  // A container's owed note has no place here: `openItem` is a card's shape (api.md 73).
  const pending = new Map(pendingItems(s, board, agent).filter((p) => p.region === undefined).map((p) => [p.n, p]));
  const unseen = new Set(unseenItems(s, board).map((u) => u.n));
  const out: OpenItem[] = [];
  for (const node of nodesOf(s, board)) {
    const v = latest(node);
    const status = s.items.get(node.n)?.status ?? 'open';
    if (!v.item || DECIDED.has(status)) continue;
    if (agent !== undefined && canWrite(s, agent, { type: 'reply', n: node.n }) !== 'ok') continue;
    const p = pending.get(node.n);
    const why = p?.ask?.kind ?? (p?.later !== undefined ? 'later' : undefined);
    out.push({
      board, n: node.n, ver: v.ver, ...placeOf(s, node.n), kind: v.kind, title: v.title, status,
      ...(why && { pending: why }), ...(unseen.has(node.n) && { unseen: true as const }),
    });
  }
  return out.sort((a, b) => a.n - b.n);
}

/** A whole container whose latest note waits for the agent (api.md 73, 77). */
export interface OpenContainer { board: string; region: string; title: string; pending: 'comment' | 'context'; note: number }

/** The containers on `board` whose latest standing note has no answer yet, for the agents that may
 * answer them (api.md 77); `openItems` stays cards only. */
export function openContainers(s: LedgerState, board: string, agent?: string): OpenContainer[] {
  const regions = s.boards.get(board)?.regions ?? [];
  return pendingItems(s, board, agent).flatMap((p) => {
    const r = p.region !== undefined && p.ask ? regions.find((x) => x.id === p.region) : undefined;
    return r && p.ask ? [{ board, region: r.id, title: r.title, pending: p.ask.kind, note: p.ask.seq }] : [];
  });
}

/** The board a ledger line belongs to: the one it names, or its node's (a link by its `from`
 * node), or its grant request's. A `join` belongs to none. */
export function eventBoard(s: LedgerState, e: LedgerEvent): string | undefined {
  const nodeBoard = (n: number | undefined) => (n === undefined ? undefined : s.nodes.get(n)?.board);
  switch (e.type) {
    case 'board': case 'region': case 'node': case 'grant-request': return e.board;
    case 'link': case 'unlink': return nodeBoard(e.from);
    case 'reply': case 'propose': case 'park': case 'seen': return nodeBoard(e.n);
    case 'join': return undefined;
    case 'act':
      if (e.n !== undefined || e.nodes) return nodeBoard(e.n ?? e.nodes![0]);
      if (e.action === 'grant' || e.action === 'deny') return s.index.requests.get(e.request!)?.board;
      return e.board;
  }
}

/** Each board's own last `seq` (`list_boards`). */
export function boardHeads(s: LedgerState, events: readonly LedgerEvent[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of events) {
    const board = eventBoard(s, e);
    if (board !== undefined) out.set(board, e.seq);
  }
  return out;
}
