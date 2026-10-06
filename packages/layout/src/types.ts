import type { Link, Mode, Region, ViewNode } from '../../format/src/index.ts';

export interface Size { w: number; h: number }
export interface Point { x: number; y: number }
export interface Box extends Point, Size {}

/** What a layout mode receives: one region's nodes and the links inside it. */
export interface ModeInput {
  region: Region;
  nodes: ViewNode[];
  links: Link[];
  sizes: Map<string, Size>;
}

export interface Lane { name: string; y: number; h: number }

/** Region-local positions; the region's content starts at (0, 0). */
export interface ModeOutput {
  pos: Map<string, Box>;
  lanes?: Lane[];
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

export interface Route { from: string; to: string; label?: string; d: string; mid: Point }

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

export interface BoardLayout {
  regions: RegionBox[];
  nodes: Map<string, Box>;
  routes: Route[];
  bounds: Box;
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
