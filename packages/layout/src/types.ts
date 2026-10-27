import type { Link, Mode, Region, ViewNode, Widths } from '#format';

export interface Size { w: number; h: number }
export interface Point { x: number; y: number }
export interface Box extends Point, Size {}

/** How cards line up across a layout's main direction (field-report batch 3 ruling 4): `start` is
 *  top for horizontal layouts (row, flow, lanes) and left for vertical ones (column); `center`
 *  centres them. Grid lines up both ways. A per-viewer page setting, so no format type. */
export type Align = 'start' | 'center';

/** What a layout mode receives: one region's nodes and the links inside it, the alignment, and the
 *  card widths in effect (`widthsOf`, ruling 5; under `match` every card in a column takes the
 *  column's widest width). Both are optional so a mode can be called on its own: start, own. */
export interface ModeInput {
  region: Region;
  nodes: ViewNode[];
  links: Link[];
  sizes: Map<string, Size>;
  align?: Align | undefined;
  widths?: Widths | undefined;
}

export interface Lane { name: string; y: number; h: number }

/** A card's cell in its mode's arrangement, from 1 (CardCell without the id). */
export type Cell = Omit<CardCell, 'id'>;

/** Region-local positions; the region's content starts at (0, 0). `cells`: each card's column and
 *  row as the mode arranged them (structureOf reads them, so the answer agrees with the picture). */
export interface ModeOutput {
  pos: Map<string, Box>;
  lanes?: Lane[];
  cells?: Map<string, Cell>;
}

export type ModeFn = (input: ModeInput) => ModeOutput;

export interface LayoutOptions {
  /** The person's placements, region-local (from the transcript). */
  pins?: Map<string, Point>;
  /** The person's container places (3_FE_04, api.md 74): region id -> the frame's top-left in
   *  board coordinates, in pin order (the last pinned wins an overlap). Packing only. */
  regionPins?: Map<string, Point>;
  /** Extra room under a container's top line (3_FE_04 ruling 3): region id -> px, the measured
   *  height of its shown note block. The frame grows by it and its cards start that much lower
   *  (content at REGION_HEAD + inset); containers below make room by the usual packing, and a
   *  pinned container stays at its pin. It is that one container's input (`layoutRegion`'s
   *  `headInset`), so a page cache keys the container on it. 0, negative or absent: no inset. */
  headInsets?: Map<string, number>;
  /** The person's mode choice per region (from the transcript). */
  modes?: Map<string, Mode>;
  /** Card widths per region, resolved by the caller with `widthsOf` (the person's, the region's,
   *  the mode's default). A region left out uses `widthsOf(mode, region.widths)`. */
  widths?: Map<string, Widths>;
  /** The viewer's alignment (ruling 4); default `start` (top, or left for vertical layouts). */
  align?: Align;
  /** Nodes not drawn (e.g. decided items when hidden). */
  hidden?: Set<string>;
  /** Width after which regions wrap to a new row. */
  maxRowWidth?: number;
}

export interface RegionBox {
  id: string;
  title: string;
  mode: Mode;
  box: Box;
  /** World point that region-local (0, 0) maps to. Pins are relative to it. */
  origin: Point;
  lanes?: Lane[];
}

/** Where a link's label goes (ruling 3), near the source end. `fits`: the label's box (centred on
 *  (x, y), on the line, `labelSize` big) fits its stretch of line without covering a card or an
 *  earlier label, so the page draws the label there; otherwise (x, y) is a point on the line where
 *  the page draws a small marker that shows the label on hover or focus. */
export interface LabelPlace extends Point { fits: boolean }

/** A drawn connector. `mid` is the point halfway along it; `labelAt` is set when it has a label. */
export interface Route { from: string; to: string; label?: string; d: string; mid: Point; labelAt?: LabelPlace }

/** One region laid out on its own (`layoutRegion`): its mode's region-local positions after pins
 *  and the collision pass, their bounds `b`, the frame's size, and `head`, the extra room under the
 *  top line (its `headInset`, 0 when none; `h` includes it). `packRegions` places it. */
export interface RegionPiece {
  region: Region;
  mode: Mode;
  out: ModeOutput;
  b: Box;
  w: number;
  h: number;
  head: number;
}

/** One card's place in its container's structure (show_layout, api.md 133). `id` is the node id
 *  (its board number as text); `column` and `row` count from 1 at the left and top. In `lanes`
 *  mode `lane` names its lane and `row` is its place in that lane's stack in the column; in
 *  `radial` mode `column` is its ring (1 = the centre) and `row` its place around the ring. */
export interface CardCell { id: string; column: number; row: number; lane?: string }

/** How a mode arranges one container, as structure only: no pixel sizes, no pins (field-report
 *  batch 3 ruling 6, api.md 133). Pure and deterministic, from the same nodes, links and mode the
 *  container is drawn from, so it agrees with the picture. `cards` in the order given; `links` =
 *  links joining two of these cards; `crossing` = how many of them cross at least one other;
 *  `empty` = cells (a column and row; in `lanes` a lane and column) inside the columns and rows
 *  used that hold no card, 0 in `radial`. The server adds the board, mode and widths. */
export interface LayoutStructure {
  lanes?: string[];
  columns: number;
  cards: CardCell[];
  links: number;
  crossing: number;
  empty: number;
}

export interface BoardLayout {
  regions: RegionBox[];
  nodes: Map<string, Box>;
  routes: Route[];
  bounds: Box;
  /** Node id -> its container, for the cards whose links route around cards (every mode but
   *  radial). Pass it to `routeLinks` to route moved boxes the same way (a drag). */
  groups: Map<string, string>;
}

export const GAP = 24;
export const COL_GAP = 72;
export const REGION_PAD = 28;
/** The top line of a region's frame: how far below the frame's top edge the content starts. The
 *  line itself straddles the border (title and count left, layout buttons right), so this is the
 *  room under it. `packages/ui/src/region/region.css` states the same number for the frame's top
 *  padding; a page test fails if the two differ. */
export const REGION_HEAD = 38;
export const REGION_GAP = 56;
export const LANE_GUTTER = 112;
/** Room above and below a lane's cards: the gutter between two lanes is twice this, wide enough
 *  for a few connector tracks (field-report batch 3 ruling 2). */
export const LANE_PAD = GAP;
