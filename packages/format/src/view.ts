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

/** Which way a `flow` container runs (D-100 5, api.md 189): `across`, left to right, or `down`, top to bottom. */
export const DIRECTIONS = ['across', 'down'] as const;
export type Direction = (typeof DIRECTIONS)[number];

/** The person's choices of a flow's direction on one board (api.md 189): theirs for the whole board, and per container. */
export interface DirectionChoices { board?: Direction; regions: Map<string, Direction> }

/** The direction a container's flow runs (api.md 189): the person's choice for the container, else theirs for the
 * board, else the container's own (`Region.direction`, the agent's), else `across`. Read like `widthsOf`, from any state
 * that holds the board's containers and the person's choices (packages/actions `LedgerState`). */
export const directionOf = (
  s: { boards: ReadonlyMap<string, { regions: readonly { id: string; direction?: Direction }[] }>; directions: ReadonlyMap<string, DirectionChoices> },
  board: string, region: string,
): Direction => {
  const chosen = s.directions.get(board);
  return chosen?.regions.get(region) ?? chosen?.board ?? s.boards.get(board)?.regions.find((r) => r.id === region)?.direction ?? 'across';
};

/** How a board looks (D-100 1, api.md 183): a skin sets how its nodes look and where their controls sit, never what
 * they do. Set on the board's `board` line by whoever makes it, and by the person's `skin` act; absent, `default`. */
export const SKINS = ['default', 'command-lens'] as const;
export type Skin = (typeof SKINS)[number];
export const DEFAULT_SKIN: Skin = 'default';

/** The built-in icons a node may name (D-100 3, api.md 184): generic nouns for planning, architecture and media work,
 * drawn once in this repo (packages/ui). None starts with `x-`, the project library's prefix, so a built-in added later
 * never clashes with a project's icon. */
export const ICON_NAMES = [
  'signal', 'camera', 'encoder', 'ingest', 'cloud', 'transcode', 'packager', 'storage', 'database', 'server',
  'network', 'cdn', 'player', 'apps', 'ad', 'lock', 'key', 'captions', 'audio', 'video',
  'clip', 'schedule', 'channel', 'live', 'share', 'user', 'team', 'monitor', 'alert', 'chart',
  'api', 'code', 'queue', 'function', 'gateway', 'shield', 'route', 'satellite', 'fibre', 'file',
  'document', 'folder', 'mail', 'chat', 'search', 'settings', 'target', 'milestone', 'idea', 'globe',
] as const;
export type IconName = (typeof ICON_NAMES)[number];
/** A name in the project's icon library (`.visionboard/icons/`, D-100 3): `x-`, then what it shows. */
export const LIBRARY_ICON_PATTERN = /^x-[a-z0-9][a-z0-9-]{0,37}$/;
/** Whether `name` names an icon of the project's library (never a built-in). */
export const isLibraryIcon = (name: string): boolean => LIBRARY_ICON_PATTERN.test(name);
/** Whether `name` may be a node's icon: a built-in, or a library name. */
export const isIconName = (name: unknown): name is string =>
  typeof name === 'string' && ((ICON_NAMES as readonly string[]).includes(name) || isLibraryIcon(name));

/** A node's tone by name (D-100 3, api.md 184): each a fixed hue the tokens tint from. */
export const TONES = ['teal', 'blue', 'violet', 'magenta', 'amber', 'orange', 'green', 'slate'] as const;
export type ToneName = (typeof TONES)[number];
/** The highest hue a tone may give: hues are whole OKLCH hue angles, 0 to 359, so each colour has one spelling. */
export const TONE_HUE_MAX = 359;
/** A node's tone: a name from `TONES`, or a hue, a whole OKLCH hue angle from 0 to `TONE_HUE_MAX`. */
export type Tone = ToneName | number;
/** Whether `v` is a tone: a name in `TONES`, or a whole number from 0 to 359 (never 360, a fraction or text). */
export const isTone = (v: unknown): v is Tone =>
  (typeof v === 'string' && (TONES as readonly string[]).includes(v)) || (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= TONE_HUE_MAX);

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
  /** Which way a `flow` runs (api.md 189); left out, `across`. The person's `direction` act wins (`directionOf`). */
  direction?: Direction;
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
  /** Its icon (api.md 184): a built-in name (`ICON_NAMES`) or one from the project's library (`isLibraryIcon`). */
  icon?: string;
  /** Its tone (api.md 184): a name from `TONES`, or a whole OKLCH hue angle from 0 to 359. */
  tone?: Tone;
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
