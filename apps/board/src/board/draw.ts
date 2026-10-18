// One draw of the board, in proportion to what changed (N12_FE_01, performance.md approaches 1-5):
// cards update and measure only where their state changed (cards.ts), containers lay out again only
// where their inputs changed (layout-cache.ts), then the containers are packed, frames and cards
// placed where they moved, connectors redrawn where their route changed (wires.ts), cards well off
// screen made cheap (offscreen.ts) and app cards' frames loaded or removed (`placed`). Reads of
// sizes happen before writes of places. A card the layout draws at a width its height was not
// measured at (Match card widths, field report batch 3) is measured again at that width and its
// container laid out once more. A fresh draw (opening a board, a rebuild) throws everything away
// and draws from scratch.
import type { NodeSize, ViewNode } from '../../../../packages/format/src/index.ts';
import type { Align, BoardLayout, Size } from '../../../../packages/layout/src/index.ts';
import { widthsOf } from '../../../../packages/format/src/index.ts';
import type { CardConditions, CardReply, VbNodeElement, VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { holdersOf } from './access.ts';
import { createCardSet } from './cards.ts';
import type { BoardData } from './io.ts';
import { createLayoutCache } from './layout-cache.ts';
import { markOffscreen } from './offscreen.ts';
import { createRegionSet } from './render.ts';
import type { RetiredCount } from './retired.ts';
import { tierOf } from './size.ts';
import type { Viewport } from './viewport.ts';
import { createWires } from './wires.ts';
import { work } from './work.ts';

export interface BoardElements {
  stage: HTMLElement;
  world: HTMLElement;
  regions: HTMLElement;
  cards: HTMLElement;
  wires: SVGSVGElement;
  /** The SVG above the cards, for the wireLayers flag. */
  wiresTop?: SVGSVGElement;
  /** The link label markers' layer, for the linkLabels flag (link-marks.ts). */
  marks?: HTMLElement;
}

export interface DrawDeps {
  els: BoardElements;
  vp: Viewport;
  /** The nodeSize flag: cards carry a size tier and its control (D-030). */
  sizing: boolean;
  /** The agentAccess flag: frames show their holders (D-027). */
  access: boolean;
  /** The wireLayers flag: connectors behind cards, the focused card's above them (D-032). */
  layers?: boolean;
  /** The linkLabels flag: labels on their lines where they fit, else markers (field report batch 3 ruling 3). */
  labels?: boolean;
  /** The widthsControl flag: each frame's Match card widths switch (ruling 5). */
  widthsControl?: boolean;
  /** The personRemove flag: Remove container in each frame's settings (N24). */
  removing?: boolean;
  /** The viewer's alignment (ruling 4; `start` without the alignSetting flag). */
  align?(): Align;
  data(): BoardData;
  hidden(): Set<string>;
  focus(): string | null;
  /** Whether the person has selected card `id` (selection.ts, 3_FE_01). */
  selected(id: string): boolean;
  /** Each shown container note block's height (region-notes.ts): the layout's head insets. */
  insets(): Map<string, number>;
  /** The containers the agent still owes an answer on (a sent note's badge, step 4G ruling 1). */
  owed(): ReadonlySet<string>;
  /** What the conditions table says about card `n` (its proposals, FE_01). */
  facts(n: ViewNode): CardConditions;
  /** The agent's replies to show under container notes (parking.ts, FE_03). */
  replies(): readonly CardReply[];
  /** The cardFlag flag: every card with a number has the flag button (flag-flow.ts). */
  flag?: boolean;
  /** Each container's "N cards retired" marker (retiredMarker flag, retired.ts). */
  retired?(): ReadonlyMap<string, RetiredCount>;
  /** The appCards flag: off, an app card draws as a plain card saying so (ruling 13). */
  appCards?: boolean;
  /** Cards were placed or the view moved: app cards load or remove their frames (app-cards.ts). */
  placed?(): void;
}

export interface Drawing {
  readonly layout: BoardLayout | null;
  readonly cards: ReadonlyMap<string, VbNodeElement>;
  /** Each container's frame, by region id. */
  readonly frames: ReadonlyMap<string, VbRegionElement>;
  /** Draw what changed since the last draw; `fresh` draws everything from scratch. */
  draw(fresh?: boolean): void;
  /** The focused card changed: redraw the connectors it lights up. */
  refocus(): void;
  /** The selection changed for `ids`: update those cards, and lay out, measure and place nothing. */
  restate(ids: readonly string[]): void;
  /** The view moved (pan, zoom, resize): mark the cards now well off screen. */
  viewMoved(): void;
  /** Connectors for a layout that is not kept, such as one with a card mid-drag. */
  wiresFor(layout: BoardLayout, focus: string | null): void;
  /** Hide the connectors as for a relayout (a container was dropped; its draw is on its way). */
  settle(): void;
}

/** How long connectors stay hidden while cards glide to new places (the cards' transition). */
const SETTLE_MS = 380;

export function createDrawing(d: DrawDeps): Drawing {
  const { els } = d;
  const cards = createCardSet(els.cards, { sizeControl: d.sizing, flag: d.flag === true, appCards: d.appCards !== false });
  const regions = createRegionSet(els.regions, { widths: d.widthsControl === true, remove: d.removing === true });
  const wires = createWires(els.wires, d.layers ? els.wiresTop : undefined, d.labels && els.marks ? { marks: els.marks } : undefined);
  const cache = createLayoutCache();
  const sizes = new Map<string, Size>();
  let layout: BoardLayout | null = null;
  let settle = 0;

  /** New card elements would glide in from the origin: skip transitions for this draw. */
  function noAnim() {
    els.world.classList.add('no-anim');
    requestAnimationFrame(() => requestAnimationFrame(() => els.world.classList.remove('no-anim')));
  }

  /** Connectors are hidden while the cards move, then fade back in. */
  function settleWires() {
    els.wires.classList.add('settling');
    clearTimeout(settle);
    settle = window.setTimeout(() => els.wires.classList.remove('settling'), SETTLE_MS);
  }

  function draw(fresh = false) {
    const data = d.data();
    if (fresh) {
      cards.clear();
      regions.clear();
      wires.clear();
      cache.clear();
      sizes.clear();
    }
    const tier = d.sizing ? (n: ViewNode): NodeSize => tierOf(n, data.state) : undefined;
    const sync = cards.sync(data.view, data.state, data.versions, d.selected, tier, d.facts);
    if (fresh || sync.created) noAnim();
    regions.sync(data.view);
    cards.measure(sync.dirty, sizes);
    for (const id of sizes.keys()) if (!cards.els.has(id)) sizes.delete(id);
    const { pins, modes, regionPins, widths } = data.state;
    const inputs = {
      pins, modes, hidden: d.hidden(), regionPins, headInsets: d.insets(), align: d.align?.() ?? 'start',
      // The widths in force per container: the person's, the agent's, the shown mode's (as the server's show_layout).
      widths: new Map(data.view.regions.map((r) => [r.id, widthsOf(modes.get(r.id) ?? r.mode, r.widths, widths.get(r.id))])),
    } as const;
    let run = cache.run(data.view, sizes, inputs);
    // A card drawn wider than its own width wraps less: its height at that width, then lay out again.
    if (cards.remeasure(run.layout, sizes).length) {
      const again = cache.run(data.view, sizes, inputs);
      run = { layout: again.layout, laidOut: [...run.laidOut, ...again.laidOut] };
    }
    work.containersLaidOut += run.laidOut.length;
    work.containers.push(...run.laidOut);
    layout = run.layout;
    const framesMoved = regions.place(layout, data.view, data.state, d.access ? holdersOf(data) : undefined, d.owed(), d.replies(), d.retired?.());
    if (cards.place(layout, sizes) || framesMoved || fresh) settleWires();
    wires.draw(layout, d.focus());
    markOffscreen(cards.els, layout, sizes, d.vp, els.stage);
    d.placed?.();
  }

  return {
    get layout() { return layout; },
    cards: cards.els,
    frames: regions.els,
    draw,
    refocus() { if (layout) wires.draw(layout, d.focus()); },
    restate: (ids) => cards.restate(ids),
    viewMoved() { markOffscreen(cards.els, layout, sizes, d.vp, els.stage); d.placed?.(); },
    wiresFor: (l, focus) => wires.draw(l, focus),
    settle: settleWires,
  };
}
