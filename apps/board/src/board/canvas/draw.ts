// One draw of the board, in proportion to what changed (N12_FE_01, performance.md approaches 1-5):
// cards update and measure only where their state changed (cards.ts), containers lay out again only
// where their inputs changed (layout-cache.ts), then the containers are packed, frames and cards
// placed where they moved, connectors redrawn where their route changed (wires.ts), cards well off
// screen made cheap (offscreen.ts) and app cards' frames loaded or removed (`placed`). Reads of
// sizes happen before writes of places. A card the layout draws at a width its height was not
// measured at (Match card widths, field report batch 3) is measured again at that width and its
// container laid out once more. A fresh draw (opening a board, a rebuild) throws everything away
// and draws from scratch. Images in cards (card-images.ts) load once their card is near, are asked
// after again when a card is selected, and a card whose image changed its height, or whose app panel
// told a new one (appFit), is measured and laid out again alone (`resized`); every card is, once a font face loads.
import type { Direction, NodeSize, ViewNode } from '#format';
import type { Align, BoardLayout, Size } from '#layout';
import { EDGE_ROW_GAP } from '#layout';
import { widthsOf } from '#format';
import type { CardConditions, CardReply, IconLibrary, MarkdownOptions, NodeTemplateOptions, SkinDef, TimelineLook, VbNodeElement, VbRegionElement } from '#ui';
import { SKIN_DEFS } from '#ui';
import { holdersOf } from '../access/index.ts';
import { createCardImages } from '../cards/index.ts';
import { createCardSet } from '../cards/index.ts';
import type { BoardData } from '../io.ts';
import { createLayoutCache } from './layout-cache.ts';
import { markOffscreen, outside, viewBounds } from './offscreen.ts';
import { createRegionSet } from './render.ts';
import type { FreshCount, RetiredCount } from '#actions';
import { tierOf } from '../cards/index.ts';
import type { Viewport } from './viewport.ts';
import { isFar } from './viewport.ts';
import { createWires } from '../links/index.ts';
import { work } from '../work.ts';
import { bindRegionUse } from './region-use.ts';

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
  /** Tell the person something went wrong (a part's code did not load). */
  say?: (text: string) => void;
  vp: Viewport;
  /** The nodeSize flag: cards carry a size tier (D-030; the selection bar's Width picks one). */
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
  /** Save container as PDF… and Export container… in each container's settings (with the host's hooks; D-107). */
  files?: { print?: boolean; export?: boolean };
  /** The toolRail flag: each frame's tools in a rail on its left edge (container tool rail). */
  rail?: boolean;
  /** The railOnHover flag: a frame's rail icons show only while it is in use (hovered or holding focus). */
  railHover?: boolean;
  /** The mount's id prefix (mount-ids.ts): before every id the cards, frames and connectors set. */
  ids?: string;
  /** How the cards' and frames' Markdown renders (the board's flags and image route). */
  markdown?: MarkdownOptions;
  /** The viewer's alignment (ruling 4; `start` without the alignSetting flag). */
  align?(): Align;
  /** The gap between a card and the card under it (`ROW_GAP` with updateSignals); absent: the layout's GAP. While
   *  the nodes draw their marks on their edges (`edges`, a skin whose marks are `edges`) it is at least EDGE_ROW_GAP. */
  rowGap?: number;
  /** Which way container `region` runs if it is a flow (`directionOf` on the shown state), which its layout control also
   *  marks; absent (the gallery), every flow runs across. */
  direction?(region: string): Direction;
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
  /** Where each node draws its marks, the board's skin's row (D-099, D-100); absent, the default skin's. */
  edges?: SkinDef;
  /** Each container's "N cards retired" marker (retiredMarker flag, packages/actions retired.ts). */
  retired?(): ReadonlyMap<string, RetiredCount>;
  /** Each fresh container's pill counts (freshCards flag, attention.ts `freshIn`). */
  fresh?(): ReadonlyMap<string, FreshCount>;
  /** The appCards flag: off, an app card draws as a plain card saying so (ruling 13). */
  appCards?: boolean;
  /** Cards were placed or the view moved: app cards load or remove their frames (app-cards.ts). */
  placed?(): void;
  /** A font that loaded after the first measure laid the board out again (boards.ts `relaid`: an opening fit follows). */
  relaid?(): void;
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
  /** How nodes draw changed (the board's skin, the icon library): the nodes `which` names (all by
   *  default) draw again on the next draw. */
  restyle(o: { edges?: SkinDef | undefined; icons?: IconLibrary }, which?: (n: ViewNode) => boolean): void;
  /** Take away what the drawing put beside the stage (the image view). */
  destroy(): void;
}

/** How long connectors stay hidden while cards glide to new places (the cards' transition). */
const SETTLE_MS = 380;

export function createDrawing(d: DrawDeps): Drawing {
  const { els } = d;
  const cardOpts: NodeTemplateOptions = {
    appCards: d.appCards !== false, idPrefix: d.ids, markdown: d.markdown, ...(d.edges && { edges: d.edges }),
  };
  const cards = createCardSet(els.cards, cardOpts);
  const regions = createRegionSet(els.regions, { widths: d.widthsControl === true, remove: d.removing === true, ...(d.files && { files: d.files }), rail: d.rail === true, railHover: d.railHover === true, direction: d.direction, idPrefix: d.ids, markdown: d.markdown });
  const use = d.rail && d.railHover ? bindRegionUse(els.stage, () => regions.els, (id) => d.data().view.nodes.find((n) => n.id === id)?.region) : undefined;
  const wires = createWires(els.wires, d.layers ? els.wiresTop : undefined, d.labels && els.marks ? { marks: els.marks } : undefined, d.ids, lookOf);
  const cache = createLayoutCache();
  const sizes = new Map<string, Size>();
  let layout: BoardLayout | null = null;
  let settle = 0;
  // A card's images load while it is within a screen of the visible stage and the zoom is not far (ruling 23).
  const images = createCardImages({
    host: els.cards, route: d.markdown?.imageRoute, viewIn: () => els.stage.parentElement!, grown: (ids) => resized(ids), say: d.say,
    near: (el) => { const b = layout?.nodes.get(el.dataset.id!); return !!b && !isFar(d.vp.k) && !outside(b, viewBounds(d.vp, els.stage)); },
  });

  // A face that finishes loading after the cards were measured (the web font swapped in for its fallback, a skin's
  // faces) wraps their text anew: every card is measured again, and laid out again if one changed (D-112's 14px body
  // wraps differently in the fallback); a board still at its opening fit fits the new bounds.
  const fontsLoaded = () => {
    const before = layout;
    if (before) resized([...cards.els.keys()]);
    if (layout !== before) d.relaid?.();
  };
  document.fonts?.addEventListener('loadingdone', fontsLoaded);

  /** A timeline dot's look (D-105): its node's kind and tone, from the view drawn, indexed once per view. */
  let looks: { view: BoardData['view']; byId: Map<string, ViewNode> } | undefined;
  function lookOf(id: string): TimelineLook | undefined {
    const view = d.data().view;
    if (looks?.view !== view) looks = { view, byId: new Map(view.nodes.map((n) => [n.id, n])) };
    const n = looks.byId.get(id);
    return n && { kind: n.kind, tone: n.tone };
  }

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
    const tier = d.sizing ? (n: ViewNode): NodeSize => tierOf(n, data.state, d.markdown?.more) : undefined;
    const sync = cards.sync(data.view, data.state, data.versions, d.selected, tier, d.facts);
    if (fresh || sync.created) noAnim();
    regions.sync(data.view);
    images.drawn(sync.dirty.map((id) => cards.els.get(id)!));
    cards.measure(sync.dirty, sizes);
    for (const id of sizes.keys()) if (!cards.els.has(id)) sizes.delete(id);
    lay(data, fresh);
  }

  /** Cards `ids` changed height by themselves (an image loaded, an app panel told its height or its
   * frame went): measure them, and when one did change, lay out and place again (only their
   * containers lay out again, layout-cache.ts). */
  function resized(ids: string[]) {
    const drawn = ids.filter((id) => layout?.nodes.has(id) && cards.els.has(id));
    const before = drawn.map((id) => sizes.get(id)?.h);
    cards.measure(drawn, sizes);
    if (drawn.some((id, i) => sizes.get(id)?.h !== before[i])) lay(d.data(), false);
    else markOffscreen(cards.els, layout, sizes, d.vp, els.stage); // measuring took the mark off
  }

  /** The containers, packed, the frames and cards placed, the connectors routed, from `sizes`. */
  function lay(data: BoardData, fresh: boolean) {
    const { pins, modes, regionPins, widths } = data.state;
    const rowGap = (cardOpts.edges ?? SKIN_DEFS.default).marks === 'edges' ? Math.max(d.rowGap ?? 0, EDGE_ROW_GAP) : d.rowGap;
    const directions = d.direction && new Map(data.view.regions.map((r) => [r.id, d.direction!(r.id)]));
    const hidden = d.hidden();
    // The containers with a dated node drawn: a timeline, whose default widths are the container's (After FE_02 (a)).
    const dated = new Set(data.view.nodes.filter((n) => n.timeline !== undefined && !hidden.has(n.id)).map((n) => n.region));
    const inputs = {
      pins, modes, hidden, regionPins, headInsets: d.insets(), align: d.align?.() ?? 'start', rowGap,
      ...(directions && { directions }),
      // The widths in force per container: the person's, the agent's, the default, the shown mode's or its timeline's
      // (as the server's show_layout and the widths switch).
      widths: new Map(data.view.regions.map((r) => [r.id, widthsOf(modes.get(r.id) ?? r.mode, r.widths, widths.get(r.id),
        dated.has(r.id) ? directions?.get(r.id) ?? 'across' : undefined)])),
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
    const framesMoved = regions.place(layout, data.view, data.state, d.access ? holdersOf(data) : undefined, d.owed(), d.replies(), d.retired?.(), d.fresh?.());
    use?.apply(); // a card that moved frame while it held focus
    if (cards.place(layout, sizes) || framesMoved || fresh) settleWires();
    wires.draw(layout, d.focus());
    markOffscreen(cards.els, layout, sizes, d.vp, els.stage);
    images.place();
    d.placed?.();
  }

  return {
    get layout() { return layout; },
    cards: cards.els,
    frames: regions.els,
    draw,
    refocus() { if (layout) wires.draw(layout, d.focus()); },
    restate(ids) {
      cards.restate(ids);
      images.selected(ids.filter((id) => d.selected(id)).map((id) => cards.els.get(id)!).filter(Boolean));
    },
    viewMoved() { markOffscreen(cards.els, layout, sizes, d.vp, els.stage); images.place(); d.placed?.(); },
    wiresFor: (l, focus) => wires.draw(l, focus),
    settle: settleWires,
    restyle(o, which) {
      if ('edges' in o) { if (o.edges) cardOpts.edges = o.edges; else delete cardOpts.edges; }
      if (o.icons) cardOpts.icons = o.icons;
      cards.refresh(which);
    },
    destroy: () => { clearTimeout(settle); images.destroy(); use?.stop(); document.fonts?.removeEventListener('loadingdone', fontsLoaded); },
  };
}
