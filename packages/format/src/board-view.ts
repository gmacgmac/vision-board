// What the agent drew, folded from the project ledger (D-017): boards, regions, node versions
// and links, and one board as the `View` the layout engine and the page read. This lives in
// format so every layer can read a board (D-016); the person's responses (acts, notes, pins,
// seen, proposals) are folded on top of it in packages/actions. Pure: same events, same board.
import type { LedgerEvent, LedgerRegion, NodeBody } from './ledger.ts';
import type { View, ViewNode } from './view.ts';
import { FORMAT_VERSION } from './view.ts';

export interface NodeVersion extends NodeBody { ver: number; at: string; agent?: string }
export interface LedgerNode { n: number; board: string; versions: NodeVersion[] }
export interface LedgerBoard { id: string; title: string; summary?: string; regions: LedgerRegion[] }
export interface LedgerLink { from: number; to: number; label?: string }

export interface DrawnState {
  seq: number;
  boards: Map<string, LedgerBoard>;
  /** n -> its versions; the latest is the last. */
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
  }
}

/** Fold every event, in order, into what was drawn. */
export function foldDrawn(events: readonly LedgerEvent[]): DrawnState {
  const s = emptyDrawn();
  for (const e of events) applyDrawn(s, e);
  return s;
}

/** The nodes of one board, in the order they were first drawn. */
export const nodesOf = (s: DrawnState, board: string): LedgerNode[] =>
  [...s.nodes.values()].filter((x) => x.board === board);

/** The latest version of a node. */
export const latest = (node: LedgerNode): NodeVersion => node.versions[node.versions.length - 1]!;

/** One board as the `View` the layout engine and the page read. Node id = `String(n)`; `n` is
 * set only on items (latest version has `item: true`). `version` = the ledger position. */
export function boardView(s: DrawnState, board: string): View {
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
