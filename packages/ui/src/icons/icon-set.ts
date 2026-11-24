// The icon set (D-100 3, decision 24): every built-in icon a node may name (`ICON_NAMES`) and every edge mark's icon,
// drawn once here in one stroke style on BE_04's box (`ICON_BOX`, 24): lines only, in `currentColor`, stroke 1.7, round
// caps and joins (icons.css). Each drawing is a list of path `d` strings and nothing else, so a built-in passes the same
// check a library drawing passes (`iconPathProblem`, icon-set.test.ts) and the page builds every element itself. Keyed by
// name: the compiler fails when a name has no drawing. The kind, action and mode icons stay in their own records
// (node-icons.ts, region-icons.ts) until T_04's tracker row folds them in. Pure data.
import type { IconName } from '#format';

/** The icons the node's marks and menus draw (D-099): not names an agent may give a node. */
export const MARK_ICONS = ['bookmark', 'clock', 'history', 'notes', 'notes-group', 'tick', 'cross', 'tick-cross', 'grip', 'more', 'put-back', 'drawer', 'expand', 'move-to', 'width', 'zoom-to', 'trash'] as const;
export type MarkIcon = (typeof MARK_ICONS)[number];

/** A circle as a path: two arcs from its left point. */
const ring = (cx: number, cy: number, r: number): string => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
/** A box with rounded corners (radius 2) as a path. */
const box = (x: number, y: number, w: number, h: number): string =>
  `M${x + 2} ${y}h${w - 4}a2 2 0 0 1 2 2v${h - 4}a2 2 0 0 1-2 2h${4 - w}a2 2 0 0 1-2-2v${4 - h}a2 2 0 0 1 2-2z`;

const WAVE = 'c3 0 3-3 6-3s3 3 6 3 3-3 6-3';
const PAGE = 'M6 3h8l4 4v14H6zM14 3v4h4';

/** Every drawing, by name: a built-in's or a mark's. */
export const ICONS: Readonly<Record<IconName | MarkIcon, readonly string[]>> = {
  signal: ['M12 11.5v8.5', ring(12, 10, 1.5), 'M8.5 13.5a5 5 0 1 1 7 0', 'M6 16.5a8.5 8.5 0 1 1 12 0'],
  camera: ['M4 8h3l1.5-2h7L17 8h3v11H4z', ring(12, 13.5, 3)],
  encoder: [box(3, 5, 18, 14), 'M7 12h2.5l1.5-3 2 6 1.5-3H17'],
  ingest: ['M12 4v10', 'M8 10l4 4 4-4', 'M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3'],
  cloud: ['M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1A4.5 4.5 0 0 1 17 18z'],
  transcode: ['M4 8h13', 'M14 5l3 3-3 3', 'M20 16H7', 'M10 13l-3 3 3 3'],
  packager: ['M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M4 7.5l8 4.5 8-4.5', 'M12 12v9'],
  storage: ['M3 5h18v4H3z', 'M5 9v10h14V9', 'M10 13h4'],
  database: ['M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z', 'M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6', 'M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3'],
  server: [box(4, 3, 16, 8), box(4, 13, 16, 8), 'M8 7h.01M8 17h.01'],
  network: [ring(12, 5, 2), ring(5, 19, 2), ring(19, 19, 2), 'M12 7v5M12 12l-5.5 5.2M12 12l5.5 5.2'],
  cdn: [ring(12, 12, 3.5), 'M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21'],
  player: [box(3, 5, 18, 14), 'M10 9l5 3-5 3z'],
  apps: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  ad: [box(3, 5, 18, 14), 'M7 15l2-6 2 6M7.7 13h2.6', 'M14 9v6h1.5a3 3 0 0 0 0-6z'],
  lock: [box(5, 11, 14, 10), 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
  key: [ring(8, 15, 4), 'M11 12l8-8', 'M16 7l2 2M14 9l2 2'],
  captions: [box(4, 6, 16, 12), 'M10.5 10.5H8v3h2.5M16 10.5h-2.5v3H16'],
  audio: ['M4 9h4l5-4v14l-5-4H4z', 'M16.5 9a4 4 0 0 1 0 6', 'M19 6.5a7.5 7.5 0 0 1 0 11'],
  video: [box(3, 6, 13, 12), 'M16 10.5l5-3v9l-5-3'],
  clip: ['M5 4h14v16H5z', 'M9 4v16M15 4v16', 'M5 8h4M5 12h4M5 16h4M15 8h4M15 12h4M15 16h4'],
  schedule: [box(4, 5, 16, 15), 'M4 10h16', 'M8 3v4M16 3v4'],
  channel: [box(3, 7, 18, 13), 'M8 3l4 4 4-4'],
  live: [ring(12, 12, 2), 'M8 8a5.5 5.5 0 0 0 0 8M16 8a5.5 5.5 0 0 1 0 8', 'M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14'],
  share: [ring(18, 5, 2.5), ring(6, 12, 2.5), ring(18, 19, 2.5), 'M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4'],
  user: [ring(12, 8, 4), 'M4 21a8 8 0 0 1 16 0'],
  team: [ring(9, 8, 3.5), 'M2.5 20a6.5 6.5 0 0 1 13 0', 'M16 4.5a3.5 3.5 0 0 1 0 7', 'M18 14a6.5 6.5 0 0 1 3.5 6'],
  monitor: [box(3, 4, 18, 12), 'M8 20h8M12 16v4'],
  alert: ['M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z', 'M10 20.5a2 2 0 0 0 4 0'],
  chart: ['M4 20h16', 'M7 16v-5M12 16V6M17 16V9'],
  api: ['M8 4C6 4 5 5 5 7v2c0 1.5-1 3-2 3 1 0 2 1.5 2 3v2c0 2 1 3 3 3', 'M16 4c2 0 3 1 3 3v2c0 1.5 1 3 2 3-1 0-2 1.5-2 3v2c0 2-1 3-3 3'],
  code: ['M8 7l-5 5 5 5', 'M16 7l5 5-5 5', 'M14 4l-4 16'],
  queue: ['M3 8h4v8H3z', 'M10 8h4v8h-4z', 'M17 12h4M19 10l2 2-2 2'],
  function: ['M15 4h-1.5a3 3 0 0 0-3 3v10a3 3 0 0 1-3 3H6', 'M8 10h7'],
  gateway: ['M4 20V9l8-5 8 5v11', 'M9 20v-6h6v6'],
  shield: ['M12 3l8 3v6c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V6z', 'M9 12l2 2 4-4'],
  route: [ring(6, 18, 2.5), ring(18, 6, 2.5), 'M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5'],
  satellite: ['M5 11a8 8 0 0 0 8 8z', 'M9 15l4-4', 'M15 4a5 5 0 0 1 5 5', 'M15 7.5A1.5 1.5 0 0 1 16.5 9'],
  fibre: [`M3 8${WAVE}`, `M3 14${WAVE}`, `M3 20${WAVE}`],
  file: [PAGE],
  document: [PAGE, 'M9 12h6M9 16h6'],
  folder: ['M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z'],
  mail: [box(3, 5, 18, 14), 'M3.5 7l8.5 6 8.5-6'],
  chat: ['M4 4h11v8H8l-4 3z', 'M15 9h5v8h-1v3l-3-3h-4v-2'],
  search: [ring(10.5, 10.5, 6.5), 'M15.5 15.5L20 20'],
  settings: [ring(12, 12, 3), 'M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1'],
  target: [ring(12, 12, 8), ring(12, 12, 4), 'M12 12h.01'],
  milestone: ['M5 21V4', 'M5 4h11l-2 4 2 4H5'],
  idea: ['M9 18h6M10 21h4', 'M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z'],
  globe: [ring(12, 12, 8.5), 'M3.5 12h17', 'M12 3.5c2.5 2.3 3.5 5.3 3.5 8.5s-1 6.2-3.5 8.5c-2.5-2.3-3.5-5.3-3.5-8.5s1-6.2 3.5-8.5z'],
  // The marks (D-099): the number's bookmark, Save for later's clock, history, the notes mark, the answer's tick and
  // cross, the two side by side on a disc that waits for its answer (D-112), the grip that drags a node with an icon,
  // More, and Put back (a moved node's row in the menus).
  bookmark: ['M7 4h10v16l-5-3.5L7 20z'],
  clock: [ring(12, 12, 8), 'M12 8v4l3 2'],
  history: ['M4 12a8 8 0 1 0 2.5-5.8L4 8.5M4 4v4.5h4.5', 'M12 8v4l3 2'],
  notes: ['M4 5h16v11h-9l-4 4v-4H4z'],
  'notes-group': ['M3 4h12v8H8l-3 3v-3H3z', 'M15 8h6v8h-1v3l-3-3h-6v-4'],
  tick: ['M5 12.5l4.5 4.5L19 7.5'],
  cross: ['M6 6l12 12M18 6L6 18'],
  'tick-cross': ['M3 12.5l2.6 2.6L10 10.5', 'M14 10l6 6M20 10l-6 6'],
  grip: ['M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01'],
  more: ['M6 12h.01M12 12h.01M18 12h.01'],
  'put-back': ['M9 14l-5-5 5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  // An app window's controls (FE_08): the drawer for its conversation (a pane on the right), and Open (to the full page).
  drawer: [box(3, 5, 18, 14), 'M15 5v14'],
  expand: ['M14 4h6v6', 'M10 20H4v-6', 'M20 4l-7 7', 'M4 20l7-7'],
  // The selection grid's commands (selection-grid task, maintainer's ask that every cell has one): Move to (an arrow into
  // a frame), Width (between two edges), Zoom to the selection (the lens with a plus, so never Search's) and Remove.
  'move-to': ['M9 5V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-1', 'M3 12h11', 'M11 9l3 3-3 3'],
  width: ['M4 5v14M20 5v14', 'M7.5 12h9', 'M10 9.5L7.5 12l2.5 2.5', 'M14 9.5l2.5 2.5-2.5 2.5'],
  'zoom-to': [ring(10.5, 10.5, 6.5), 'M15.5 15.5L20 20', 'M10.5 8v5M8 10.5h5'],
  trash: ['M4 7h16', 'M9.5 7V4.5h5V7', 'M6 7l1 13h10l1-13', 'M10 11v5.5M14 11v5.5'],
};
