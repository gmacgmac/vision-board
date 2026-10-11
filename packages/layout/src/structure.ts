// show_layout's answer (field-report batch 3 ruling 6, api.md 133): how a mode arranges one
// container, as structure only. It runs the same mode and the same router the picture uses, on
// cards of one size (the server has no measured sizes, and pins are the person's, not the
// arrangement), so its columns, rows and crossings agree with what is drawn. Pure.
import type { Link, Mode, Region, ViewNode, Widths } from '../../format/src/index.ts';
import type { CardCell, LayoutStructure, Size } from './types.ts';
import { MODE_FNS } from './board.ts';
import { laneNames } from './modes/lanes/lanes.ts';
import { crossingLines } from './route/crossings.ts';
import { routeLines } from './route/route.ts';

/** The size every card is taken to be: a small card (D-030's S width) of a usual height. */
export const STRUCTURE_CARD: Size = { w: 280, h: 120 };

/** `nodes`: the container's cards in card order; `links`: any links, those joining two of these
 *  cards are used; `mode`: the mode shown (the person's, else the region's). */
export function structureOf(
  region: Region, nodes: ViewNode[], links: Link[], mode: Mode = region.mode, widths?: Widths,
): LayoutStructure {
  const ids = new Set(nodes.map((n) => n.id));
  const inner = links.filter((l) => l.from !== l.to && ids.has(l.from) && ids.has(l.to));
  const lanes = mode === 'lanes' ? laneNames(region, nodes) : undefined;
  if (!nodes.length) return { ...(lanes && { lanes }), columns: 0, cards: [], links: 0, crossing: 0, empty: 0 };
  const sizes = new Map(nodes.map((n) => [n.id, STRUCTURE_CARD]));
  const out = MODE_FNS[mode]({ region: { ...region, mode }, nodes, links: inner, sizes, align: 'start', widths });
  const cards: CardCell[] = nodes.map((n) => ({ id: n.id, ...out.cells!.get(n.id)! }));
  const columns = Math.max(...cards.map((c) => c.column));
  const groups = mode === 'radial' ? undefined : new Map(nodes.map((n) => [n.id, region.id]));
  const crossing = crossingLines(routeLines(inner, out.pos, groups).map((r) => r.pts));
  return { ...(lanes && { lanes }), columns, cards, links: inner.length, crossing, empty: emptyOf(mode, cards, columns, lanes) };
}

/** Cells inside the columns and rows used that hold no card: in lanes a lane and column (a stack
 *  counts once), elsewhere a column and row; 0 in radial. */
function emptyOf(mode: Mode, cards: CardCell[], columns: number, lanes?: string[]): number {
  if (mode === 'radial') return 0;
  if (lanes) return lanes.length * columns - new Set(cards.map((c) => `${c.column} ${c.lane}`)).size;
  const rows = Math.max(...cards.map((c) => c.row));
  return columns * rows - new Set(cards.map((c) => `${c.column} ${c.row}`)).size;
}
