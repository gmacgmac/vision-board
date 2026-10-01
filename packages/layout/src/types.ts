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

export interface BoardLayout {
  regions: RegionBox[];
  nodes: Map<string, Box>;
  routes: Route[];
  bounds: Box;
}

export const GAP = 24;
export const COL_GAP = 72;
export const REGION_PAD = 28;
export const REGION_HEAD = 40;
export const REGION_GAP = 56;
export const LANE_GUTTER = 112;
