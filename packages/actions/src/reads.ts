// The read views the API answers with (api.md Operations, 31-36): one node with its whole
// history, one container, the open items, and the board list. Pure reads
// of the folded ledger; the shapes are the response schemas in packages/format/schema/api/.
// Optional fields are left out when they do not apply (api.md 32). The fold keys cards by identity;
// every card here is named by its board number (numbers.ts, api.md 125). No read shows a flag.

import type { LedgerNode, LedgerRegion, NodeBody, NodeSize, ParkBundle } from '../../format/src/index.ts';
import { containerKey, everyNodeOf, latest, NODE_TYPES, nodesOf } from '../../format/src/index.ts';
import type { BoardRun, ItemNote, LedgerReply, LedgerState } from './fold.ts';
import { sentNotes } from './fold.ts';
import type { Place } from './containers.ts';
import { containerNotes, containerPin, noteJson } from './containers.ts';
import { CONDITIONS, conditionsOf } from './conditions.ts';
import { creatorOf, holders } from './grants.ts';
import type { ProposalView } from './numbers.ts';
import { linkOut, noteOut, numberOf, proposalOut } from './numbers.ts';
import { mayAnswer } from './permissions.ts';
import { visibleToAgents } from './archive.ts';
import { placeOf } from './references.ts';
import type { ItemStatus } from './registry.ts';
import { isDecided } from './registry.ts';

/** One version of a node: what the agent said, when, and who. */
export interface NodeVersionView { ver: number; at: string; agent?: string; node: NodeBody }

/** Everything known about one node (`show_node`, `show_container`); `n` is its board number. */
export interface NodeDetail {
  n: number;
  board: string;
  /** The container it is in now: the person's latest move, else its latest version's (api.md 68). */
  region: string;
  /** Where the agent has it, when the person put it somewhere else (3_FE_03 ruling 2). */
  moved_from?: string;
  /** Where the card stands with the person; every card has one (api.md 120). */
  status: ItemStatus;
  /** The person's size pick; it wins over the agent's suggestion. */
  size?: NodeSize;
  /** The latest version the person has seen. */
  seen?: number;
  versions: NodeVersionView[];
  notes: ItemNote[];
  replies: LedgerReply[];
  proposals: ProposalView[];
  park?: ParkBundle;
  /** Links from or to this node. */
  links: { from: number; to: number; label?: string }[];
  /** The `seq` of the line that retired it, for a card off the board (api.md 127). */
  retired?: number;
}

/** One container: the region as stored (its centre by board number), who holds it, every node it
 * has held, the person's notes on the whole container (oldest first, api.md 75), when placed, where
 * (api.md 74), and for a retired container its retire line (api.md 127). */
export interface ContainerDetail {
  board: string; region: LedgerRegion; holders: string[]; nodes: NodeDetail[]; notes: ItemNote[]; retired?: number; pin?: Place;
}

/** An unanswered grant request as the board page shows it (`get_board`): which container, why,
 * and the asking agent's id and the label it joined with. */
/** An open grant request; with no `region` it asks for the whole board (api.md 81). */
export interface AccessRequest { seq: number; region?: string; reason: string; at: string; agent?: string; label?: string }

/** One holder of a board or a container, with its label; `creator` marks the agent that made it,
 * which the person cannot remove (api.md 23, 82). */
export interface AccessHolder { agent: string; label: string; creator?: true }

/** Who may write where on one board: the open requests, the board's holders and each region's.
 * Each is left out when it is empty, so a board with no agents carries none (api.md 32). */
export interface BoardAccess {
  requests?: AccessRequest[]; boardHolders?: AccessHolder[]; holders?: Record<string, AccessHolder[]>;
}

/** A card still open for the person or the agent (`list_open`, and `pending` on a write answer):
 * one that needs an answer and is not decided, or any card owing an answer or a handover. */
export interface OpenItem {
  board: string; n: number; ver: number; region: string; moved_from?: string; kind: NodeBody['kind']; title: string;
  status: ItemStatus;
  pending?: 'comment' | 'context' | 'later';
  unseen?: true;
}

/** One version as `show_node` gives it; an old line's `item` mark is left out (api.md 118). */
const versionView = ({ ver, at, agent, item: _item, ...node }: LedgerNode['versions'][number]): NodeVersionView =>
  ({ ver, at, ...(agent !== undefined && { agent }), node });

/** Where card `id` is, and where the agent has it when the person moved it (api.md 68). */
const whereIs = (s: LedgerState, id: number) => {
  const p = placeOf(s, id)!;
  return { region: p.region, ...(p.region !== p.drawn && { moved_from: p.drawn }) };
};

/** Everything known about card `id`, retired or not, or undefined when there is no such card. */
export function nodeDetail(s: LedgerState, id: number): NodeDetail | undefined {
  const node = s.nodes.get(id);
  if (!node) return undefined;
  const last = latest(node);
  const size = s.sizes.get(id);
  const seen = s.seen.get(id);
  const park = s.parks.get(id);
  return {
    n: numberOf(s, id), board: node.board, ...whereIs(s, id),
    status: s.items.get(id)?.status ?? 'open',
    ...(size !== undefined && { size }),
    ...(seen !== undefined && { seen }),
    versions: node.versions.map(versionView),
    notes: sentNotes(s, node.board, s.items.get(id)?.notes ?? []).map((x) => noteOut(s, x)),
    replies: [...(s.replies.get(id) ?? [])],
    proposals: [...s.proposals.values()].filter((p) => p.id === id).map((p) => proposalOut(s, p)),
    ...(park && { park }),
    links: [...s.links.values()].filter((l) => l.from === id || l.to === id).map((l) => linkOut(s, l)),
    ...(node.retired !== undefined && { retired: node.retired }),
  };
}

/** The cards linked to `id`, one hop, each in full (`show_node` with `linked=true`); an old line's
 * link to a card on a board agents don't see (an archived one, api.md 136) is left out. */
export function linkedDetails(s: LedgerState, id: number): NodeDetail[] {
  const others = new Set<number>();
  for (const l of s.links.values()) {
    if (l.from === id) others.add(l.to);
    if (l.to === id) others.add(l.from);
  }
  others.delete(id);
  for (const x of others) if (!visibleToAgents(s, s.nodes.get(x)?.board ?? '')) others.delete(x);
  return [...others].sort((a, b) => a - b).map((x) => nodeDetail(s, x)).filter((d): d is NodeDetail => d !== undefined);
}

/** One container on `board`, on the board or retired, or undefined when the board never had it. A
 * card belongs if any of its versions was in the region, or the person put it there (api.md 68),
 * or it left the board with the container; a retired card carries `retired` (api.md 127). */
export function containerDetail(s: LedgerState, board: string, region: string): ContainerDetail | undefined {
  const gone = s.retiredRegions.get(containerKey(board, region));
  const r = s.boards.get(board)?.regions.find((x) => x.id === region) ?? gone?.region;
  if (!r) return undefined;
  const nodes = everyNodeOf(s, board).filter((x) => placeOf(s, x.id)?.region === region || x.versions.some((v) => v.region === region)
    || (gone !== undefined && x.retired === gone.seq));
  const pin = gone ? undefined : containerPin(s, board, region);
  const { center, ...rest } = r;
  return {
    board, region: { ...rest, ...(center !== undefined && s.nodes.has(center) && { center: numberOf(s, center) }) }, holders: holders(s, board, region),
    nodes: nodes.map((x) => nodeDetail(s, x.id)!),
    notes: containerNotes(s, board, region).map(noteJson),
    ...(gone && { retired: gone.seq }),
    ...(pin && { pin }),
  };
}

/** The open grant requests on `board` (the `grant.requested` row), oldest first, the board's
 * holders and each region's, creator first (`get_board`, D-027, D-034). Labels come from each
 * agent's `join`. */
export function boardAccess(s: LedgerState, board: string): BoardAccess {
  const label = (agent: string) => s.agents.get(agent) ?? agent;
  const requests = CONDITIONS['grant.requested'].derive(s, { board }).map(({ seq, container }): AccessRequest => {
    const { agent } = s.index.requests.get(seq!)!;
    const { reason, at } = s.grantNotes.get(seq!)!;
    return { seq: seq!, ...(container !== undefined && { region: container }), reason, at, ...(agent !== undefined && { agent, label: label(agent) }) };
  });
  /** The holders of the board, or with `region` of one container, creator first. */
  const of = (region?: string): AccessHolder[] => {
    const creator = creatorOf(s, board, region);
    return holders(s, board, region)
      .map((agent): AccessHolder => ({ agent, label: label(agent), ...(agent === creator && { creator: true as const }) }))
      .sort((a, b) => Number(b.creator ?? false) - Number(a.creator ?? false));
  };
  const held: Record<string, AccessHolder[]> = {};
  for (const r of s.boards.get(board)?.regions ?? []) {
    const list = of(r.id);
    if (list.length) held[r.id] = list;
  }
  const boardHolders = of();
  return {
    ...(requests.length > 0 && { requests }), ...(boardHolders.length > 0 && { boardHolders }),
    ...(Object.keys(held).length > 0 && { holders: held }),
  };
}

/** The open cards on `board`, by number: every card that needs an answer and is not decided, and
 * any card of any kind the agent owes an answer or a handover on (api.md 120), with why each waits
 * for the agent (`item.owed`: its ask's kind, else `later`) and whether the person has a version
 * still to see (`item.unseen`) (api.md 36, D-018). With `agent`, only the cards it may answer: in
 * a container it holds, or whose latest version it wrote (api.md 41). A container's owed note has
 * no place here: `openItem` is a card's shape (api.md 73, `openContainers`). */
export function openItems(s: LedgerState, board: string, agent?: string): OpenItem[] {
  const pending = new Map<number, NonNullable<OpenItem['pending']>>();
  const unseen = new Set<number>();
  for (const c of conditionsOf(s, { board, agent })) {
    if (c.kind === 'item.owed') pending.set(c.id!, s.asks.get(c.seq!)?.kind ?? 'later');
    if (c.kind === 'item.unseen') unseen.add(c.id!);
  }
  const out: OpenItem[] = [];
  for (const node of nodesOf(s, board)) {
    const v = latest(node);
    const status = s.items.get(node.id)?.status ?? 'open';
    const why = pending.get(node.id);
    const open = NODE_TYPES[v.kind].answer && !isDecided(v.kind, status);
    if (!(open || why) || (agent !== undefined && !mayAnswer(s, agent, node.id))) continue;
    out.push({
      board, n: numberOf(s, node.id), ver: v.ver, ...whereIs(s, node.id), kind: v.kind, title: v.title, status,
      ...(why && { pending: why }), ...(unseen.has(node.id) && { unseen: true as const }),
    });
  }
  return out.sort((a, b) => a.n - b.n);
}

/** A whole container whose latest note waits for the agent (api.md 73, 77). */
export interface OpenContainer { board: string; region: string; title: string; pending: 'comment' | 'context'; note: number }

/** The containers on `board` whose latest standing note has no answer yet (`container.owed`), for
 * the agents that may answer them (api.md 77); `openItems` stays cards only. */
export function openContainers(s: LedgerState, board: string, agent?: string): OpenContainer[] {
  const regions = s.boards.get(board)?.regions ?? [];
  return conditionsOf(s, { board, agent }).flatMap((c) => {
    const r = c.kind === 'container.owed' ? regions.find((x) => x.id === c.container) : undefined;
    return r ? [{ board, region: r.id, title: r.title, pending: s.asks.get(c.seq!)!.kind, note: c.seq! }] : [];
  });
}

/** One board in `list_boards`: its id, title and its own last line (fold.ts `heads`). */
export interface BoardListItem { board: string; title: string; seq: number }

/** Every board agents see (an archived one is left out, api.md 136), in the order drawn, with its
 * title and its own last line (`list_boards`, and the page's picker). */
export const boardList = (s: LedgerState): BoardListItem[] =>
  [...s.boards.values()].filter((b) => visibleToAgents(s, b.id)).map((b) => ({ board: b.id, title: b.title, seq: s.heads.get(b.id)! }));

/** A board's versions (navigation FE_01 ruling 2): `now`, its own last line (fold.ts `heads`, so
 * other boards and the person's board seen never move it), and the past ones, newest first: each
 * run of agent drawing lines that ended before it (fold.ts `runs`), "v<seq>" with its time.
 * Undefined for a board with no lines. */
export interface BoardVersions { now: number; past: BoardRun[] }

export function boardVersions(s: LedgerState, board: string): BoardVersions | undefined {
  const now = s.heads.get(board);
  if (now === undefined) return undefined;
  return { now, past: (s.runs.get(board) ?? []).filter((r) => r.seq < now).reverse() };
}
