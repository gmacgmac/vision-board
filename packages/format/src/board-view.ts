// What the agent drew, folded from the project ledger (D-017): boards, regions, node versions
// and links, and one board as the `View` the layout engine and the page read. This lives in
// format so every layer can read a board (D-016); the person's responses (acts, notes, pins,
// seen, proposals) are folded on top of it in packages/actions. Pure: same events, same board.
// A card is its identity (`id`) here; the View names it by its board number (D-041 proposed,
// api.md 125), and leaves out what was retired (api.md 126).
import type { LedgerEvent, LedgerRegion, NodeBody } from './ledger.ts';
import type { View, ViewNode } from './view.ts';
import { FORMAT_VERSION } from './view.ts';

export interface NodeVersion extends NodeBody { ver: number; at: string; agent?: string }
/** One card: its identity, its board, its versions, and the `seq` of the `retire` line that took it
 * off the board, if one did. Its board number is its place in `LedgerBoard.cards` (the index
 * answers it: `boardNumber`); it is left off here so code never takes one number for the other. */
export interface LedgerNode { id: number; board: string; versions: NodeVersion[]; retired?: number }
/** `regions`: the containers on the board now (a retired one leaves); `cards`: every card's
 * identity in the order first drawn, retired or not, so card `n` is at `n - 1`. */
export interface LedgerBoard { id: string; title: string; summary?: string; regions: LedgerRegion[]; cards: number[] }
export interface LedgerLink { from: number; to: number; label?: string }

export interface DrawnState {
  seq: number;
  boards: Map<string, LedgerBoard>;
  /** Card identity -> its versions; the latest is the last. */
  nodes: Map<number, LedgerNode>;
  /** Keyed "from>to". */
  links: Map<string, LedgerLink>;
}

export const emptyDrawn = (): DrawnState =>
  ({ seq: 0, boards: new Map(), nodes: new Map(), links: new Map() });

/** Apply one valid event's drawn part to `s`; other event types only advance `seq`. */
export function applyDrawn(s: DrawnState, e: LedgerEvent): void {
  s.seq = e.seq;
  switch (e.type) {
    // A second line (the person's rename, api.md 90) replaces the title and summary only.
    case 'board': {
      const b = s.boards.get(e.board);
      s.boards.set(e.board, {
        id: e.board, title: e.title, ...(e.summary && { summary: e.summary }), regions: b?.regions ?? [], cards: b?.cards ?? [],
      });
      break;
    }
    case 'region': {
      const regions = s.boards.get(e.board)?.regions;
      const i = regions?.findIndex((r) => r.id === e.region.id) ?? -1;
      if (regions && i >= 0) regions[i] = e.region;
      else regions?.push(e.region);
      break;
    }
    case 'node': {
      let node = s.nodes.get(e.id);
      if (!node) {
        const cards = s.boards.get(e.board)?.cards ?? [];
        cards.push(e.id);
        node = { id: e.id, board: e.board, versions: [] };
        s.nodes.set(e.id, node);
      }
      node.versions.push({ ...e.node, ver: e.ver, at: e.at, ...(e.agent && { agent: e.agent }) });
      break;
    }
    case 'retire': {
      for (const id of e.cards) { const x = s.nodes.get(id); if (x) x.retired = e.seq; }
      const b = s.boards.get(e.board);
      if (b && e.region !== undefined) b.regions = b.regions.filter((r) => r.id !== e.region);
      break;
    }
    case 'link': s.links.set(`${e.from}>${e.to}`, { from: e.from, to: e.to, ...(e.label && { label: e.label }) }); break;
    case 'unlink': s.links.delete(`${e.from}>${e.to}`); break;
  }
}

/** Fold every event, in order, into what was drawn. */
export function foldDrawn(events: readonly LedgerEvent[]): DrawnState {
  const s = emptyDrawn();
  for (const e of events) applyDrawn(s, e);
  return s;
}

/** Every card of one board, retired or not, in the order first drawn (board number order): its
 * history (api.md 126). */
export const everyNodeOf = (s: DrawnState, board: string): LedgerNode[] =>
  (s.boards.get(board)?.cards ?? []).map((id) => s.nodes.get(id)!);

/** The cards on one board now, in the order first drawn: retired cards left out. */
export const nodesOf = (s: DrawnState, board: string): LedgerNode[] =>
  everyNodeOf(s, board).filter((x) => x.retired === undefined);

/** The latest version of a node. */
export const latest = (node: LedgerNode): NodeVersion => node.versions[node.versions.length - 1]!;

/** One board as the `View` the layout engine and the page read, in board numbers (api.md 125):
 * node id = `String(n)`, every node carries its number `n`, and links and a radial centre name
 * nodes the same way. Retired cards and containers are left out, and so are links and a centre
 * that name one (api.md 126); an old `item` mark is left out. `version` = the ledger position. */
export function boardView(s: DrawnState, board: string): View {
  const b = s.boards.get(board);
  if (!b) throw new Error(`unknown board "${board}"`);
  const nodes = everyNodeOf(s, board).map((x, i) => ({ x, n: i + 1 })).filter(({ x }) => x.retired === undefined);
  const shown = new Map(nodes.map(({ x, n }) => [x.id, String(n)]));
  return {
    format: FORMAT_VERSION, session: b.id, version: s.seq, title: b.title,
    ...(b.summary && { summary: b.summary }),
    regions: b.regions.map(({ center, ...r }) => {
      const c = center === undefined ? undefined : shown.get(center);
      return { ...r, ...(c !== undefined && { center: c }) };
    }),
    nodes: nodes.map(({ x, n }) => viewNode(n, latest(x))),
    links: [...s.links.values()].filter((l) => shown.has(l.from) && shown.has(l.to))
      .map((l) => ({ from: shown.get(l.from)!, to: shown.get(l.to)!, ...(l.label && { label: l.label }) })),
  };
}

function viewNode(n: number, v: NodeVersion): ViewNode {
  const { ver: _ver, at: _at, agent: _agent, item: _item, ...body } = v;
  return { id: String(n), ...body, n };
}
