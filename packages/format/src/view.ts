// The projection layout reads: one board, folded from the project ledger by `boardView`
// (board-view.ts), never read from a file. Meaning only, never coordinates: layout is the
// engine's job (project rule 9).
import type { AppRef } from './apps.ts';
import type { NodeSize } from './ledger.ts';

export const FORMAT_VERSION = 1;

/** How a container lays out its cards. `column` stacks them top to bottom and `row` lays them left
 * to right, both in card order with no links needed; `flow` follows the links (api.md 129). */
export const MODES = ['grid', 'flow', 'lanes', 'radial', 'column', 'row'] as const;
export type Mode = (typeof MODES)[number];

/** Mode names older ledger lines may carry, and what they read as now: ledger v12 renamed `list`
 * to `column` (api.md 129). A v12 line naming one is refused with `LIST_RENAMED` (ledger.ts). */
export const RENAMED_MODES: Readonly<Record<string, Mode>> = { list: 'column' };

/** How wide a container's cards are (api.md 132): `match`, every card in a column as wide as the
 * column's widest card, or `own`, each card its own width. */
export const WIDTHS = ['match', 'own'] as const;
export type Widths = (typeof WIDTHS)[number];

/** Each mode's card widths when neither the person nor the agent set them (field-report batch 3
 * ruling 5, api.md 132): the one place they are defined. */
export const DEFAULT_WIDTHS: Readonly<Record<Mode, Widths>> = {
  grid: 'match', column: 'match', flow: 'own', row: 'own', lanes: 'own', radial: 'own',
};

/** The card widths in effect for a container shown in `mode`: the person's choice wins, then the
 * container's own (`Region.widths`), then the mode's default (api.md 132). */
export const widthsOf = (mode: Mode, own?: Widths, chosen?: Widths): Widths => chosen ?? own ?? DEFAULT_WIDTHS[mode];

/** Node kinds the agent draws from. The kind decides what a card offers (`NODE_TYPES`). An `app`
 * card shows an app the agent built, in a panel inside the card (ledger v17, D-047). */
export const KINDS = ['question', 'finding', 'decision', 'risk', 'action', 'topic', 'note', 'app'] as const;
export type Kind = (typeof KINDS)[number];

export interface Region {
  id: string;
  title: string;
  mode: Mode;
  /** lanes mode: lane names, top to bottom. */
  lanes?: string[];
  /** radial mode: the node at the centre (defaults to the most-linked node). */
  center?: string;
  /** grid mode: column count hint. */
  columns?: number;
  /** The agent's card widths (api.md 132); left out, the mode decides (`widthsOf`). */
  widths?: Widths;
}

export interface ViewNode {
  id: string;
  region: string;
  kind: Kind;
  title: string;
  body?: string;
  /** The card's number on its board: 1, 2, 3... in the order drawn, never reused (D-041 proposed,
   * api.md 125). `boardView` sets it on every node, and the node's `id` is `String(n)`. */
  n?: number;
  /** lanes mode: which lane. */
  lane?: string;
  tags?: string[];
  emphasis?: boolean;
  /** The agent's card size suggestion (D-030); the person's `size` act wins (BoardState.sizes). */
  size?: NodeSize;
  /** An app card's app and panel size (api.md 150); on no other kind. */
  app?: AppRef;
}

export interface Link {
  from: string;
  to: string;
  label?: string;
}

export interface View {
  format: typeof FORMAT_VERSION;
  session: string;
  version: number;
  title: string;
  summary?: string;
  regions: Region[];
  nodes: ViewNode[];
  links: Link[];
}

/** Keys that would smuggle coordinates into a view. */
export const FORBIDDEN_KEYS = ['x', 'y', 'pos', 'position', 'left', 'top', 'width', 'height'];

export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
