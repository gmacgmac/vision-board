// The zoom rules (D-101; FIX_02, the maintainer's points 430-438, 444 and 445): one row per part of the board, what it
// does as the person zooms (its rule), its numbers and the CSS variable or stage attribute the page writes for it. The
// one home of every zoom number: the board's canvas/viewport.ts reads them and writes the variables, the CSS reads only
// those variables (and tokens.css --vb-mark-min and --vb-mark-h, which apps/board/tests/zoom-rules.test.ts holds equal
// to this table), and that test fails on a zoom constant declared anywhere else. In #ui, so a pattern's own rule (the
// selection bar's gap) lives here too. components.md § Zoom groups points here. Each row's part is its comment: no
// words ship. Plain data, no imports.

/** What a part does as the board zooms: scales with it, keeps one size, grows to keep a minimum, scales only between
 *  two zooms (or is bounded by them), or is hidden below a zoom. */
export type ZoomRule = 'scales' | 'fixed' | 'grows-to-minimum' | 'clamped' | 'hidden-below';

export interface ZoomRow {
  rule: ZoomRule;
  /** Zooms (1 is 100%) or screen pixels (`…Px`), named. */
  numbers: Readonly<Record<string, number>>;
  /** The CSS variable or stage attribute the page writes for it, if any. */
  writes?: string;
}

export const ZOOM_RULES = {
  /** The board: the zoom the person can reach (viewport.ts `zoomAt`, `set`). */
  range: { rule: 'clamped', numbers: { min: 0.2, max: 2.5 } },
  /** Zooming in and out: + and - by `button` (selection-flow.ts); Ctrl or Cmd + scroll by e^(-delta x `wheel`) (pointer.ts). */
  steps: { rule: 'scales', numbers: { button: 1.2, wheel: 0.0015 } },
  /** Fit (F): `marginPx` a side, never past 110%. */
  fit: { rule: 'clamped', numbers: { cap: 1.1, marginPx: 32 } },
  /** Z on a selection: it fills 75% of the stage, up to the top zoom. */
  selectionFit: { rule: 'clamped', numbers: { fill: 0.75 } },
  /** Z on one app card: it fills 95% of the stage, up to the top zoom. */
  appFit: { rule: 'clamped', numbers: { fill: 0.95 } },
  /** Nodes, links, container frames: the world's one transform. */
  world: { rule: 'scales', numbers: {} },
  /** A container's title line and rail, the hover halo: counter-scaled by the zoom on the regions layer (region.css,
   *  region-rail.css, board.css). */
  containerLine: { rule: 'fixed', numbers: {}, writes: '--vb-zoom' },
  /** Menus, the answer picker, tips, the selection bar, the toolbar: drawn on the stage, outside the world. */
  overlays: { rule: 'fixed', numbers: {} },
  /** The space between the selection bar and the cards' top tabs: `perK` px per unit of zoom, between `minPx` and
   *  `maxPx` (selection-bar-core.ts `pillGap`). */
  barGap: { rule: 'clamped', numbers: { perK: 8, minPx: 4, maxPx: 16 } },
  /** The history and the proposal box: in the node, counter-scaled by 1/zoom (mark-boxes.ts). */
  markBoxes: { rule: 'fixed', numbers: {}, writes: '--vb-box-scale' },
  /** The conversation box: one size below 80%, scales with the board from 80% to 120%, one size above (points 444,
   *  445; notes.ts). */
  conversationBox: { rule: 'clamped', numbers: { min: 0.8, max: 1.2 }, writes: '--vb-box-scale' },
  /** A node's edge marks (number, disc, notes, badges, kind tab, grip): under `minPx` on screen they grow in place by
   *  steps of `step`; past the far breakpoint (`farSteps` steps, about 37%) the growth stays and they scale with the
   *  node (points 430-438). */
  marks: { rule: 'grows-to-minimum', numbers: { minPx: 14, heightPx: 22, step: 1.2, farSteps: 3 }, writes: '--vb-mark-grow' },
  /** A press on an edge mark: past the far breakpoint it selects the node only, no hand (the keyboard as ever). */
  markPress: { rule: 'hidden-below', numbers: {}, writes: 'data-marks' },
  /** A node's body controls, a container's tools, an app's panel: hidden under 55% (hideControlsZoomedOut flag); an
   *  app shows its placeholder. */
  farControls: { rule: 'hidden-below', numbers: { below: 0.55 }, writes: 'data-zoom' },
} as const satisfies Record<string, ZoomRow>;
