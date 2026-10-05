// One draw of the board, in proportion to what changed (N12_FE_01, performance.md approaches 1-5):
// cards update and measure only where their state changed (cards.ts), containers lay out again only
// where their inputs changed (layout-cache.ts), then the containers are packed, frames and cards
// placed where they moved, connectors redrawn where their route changed (wires.ts), and cards well
// off screen made cheap (offscreen.ts). Reads of sizes happen before writes of places. A fresh draw
// (opening a board, a rebuild) throws everything away and draws from scratch.
import type { NodeSize, ViewNode } from '../../../../packages/format/src/index.ts';
import type { BoardLayout, Size } from '../../../../packages/layout/src/index.ts';
import type { VbNodeElement } from '../../../../packages/ui/src/index.ts';
import { holdersOf } from './access.ts';
import { createCardSet } from './cards.ts';
import type { BoardData } from './io.ts';
import { createLayoutCache } from './layout-cache.ts';
import { markOffscreen } from './offscreen.ts';
import { createRegionSet } from './render.ts';
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
}

export interface DrawDeps {
  els: BoardElements;
  vp: Viewport;
  /** The nodeSize flag: cards carry a size tier and its control (D-030). */
  sizing: boolean;
  /** The agentAccess flag: frames show their holders (D-027). */
  access: boolean;
  data(): BoardData;
  hidden(): Set<string>;
  focus(): string | null;
  /** Whether the person has selected card `id` (selection.ts, 3_FE_01). */
  selected(id: string): boolean;
}

export interface Drawing {
  readonly layout: BoardLayout | null;
  readonly cards: ReadonlyMap<string, VbNodeElement>;
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
}

/** How long connectors stay hidden while cards glide to new places (the cards' transition). */
const SETTLE_MS = 380;

export function createDrawing(d: DrawDeps): Drawing {
  const { els } = d;
  const cards = createCardSet(els.cards, { sizeControl: d.sizing });
  const regions = createRegionSet(els.regions);
  const wires = createWires(els.wires);
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
    const sync = cards.sync(data.view, data.state, data.versions, d.selected, tier);
    if (fresh || sync.created) noAnim();
    regions.sync(data.view);
    cards.measure(sync.dirty, sizes);
    for (const id of sizes.keys()) if (!cards.els.has(id)) sizes.delete(id);
    const run = cache.run(data.view, sizes, { pins: data.state.pins, modes: data.state.modes, hidden: d.hidden() });
    work.containersLaidOut += run.laidOut.length;
    work.containers.push(...run.laidOut);
    layout = run.layout;
    const framesMoved = regions.place(layout, data.view, data.state, d.access ? holdersOf(data) : undefined);
    if (cards.place(layout) || framesMoved || fresh) settleWires();
    wires.draw(layout, d.focus());
    markOffscreen(cards.els, layout, sizes, d.vp, els.stage);
  }

  return {
    get layout() { return layout; },
    cards: cards.els,
    draw,
    refocus() { if (layout) wires.draw(layout, d.focus()); },
    restate: (ids) => cards.restate(ids),
    viewMoved() { markOffscreen(cards.els, layout, sizes, d.vp, els.stage); },
    wiresFor: (l, focus) => wires.draw(l, focus),
  };
}
