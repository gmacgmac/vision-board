// A small board in the gallery, drawn by the board's own drawing (draw.ts: cards, frames, the layout
// cache, connectors, labels and markers) from one container of the fixture ledger (rule 11: a
// fixture board and a live session go through the same code). The stage is sized to the drawn
// board. Measuring needs the page, so each mini board draws once the gallery is in the document
// (`drawMiniBoards`, main.ts).
import type { View, ViewNode } from '#format';
import type { BoardState, FreshCount } from '#actions';
import type { Align } from '#layout';
import type { CardConditions } from '#ui';
import { createDrawing, type Drawing } from '../board/draw.ts';
import { FAR_K, Viewport } from '../board/viewport.ts';
import { el } from './dom.ts';

export interface MiniOptions {
  /** The cards list's name. */
  label: string;
  align?: Align;
  /** The linkLabels flag: labels on their lines, else markers. */
  labels?: boolean;
  /** The widthsControl flag: the frame's Match card widths switch. */
  widths?: boolean;
  /** A second drawing of a container takes this after its region and node ids, so no id is on the
   *  page twice; the person's state, keyed by the first ids, does not follow it. */
  suffix?: string;
  /** The zoom it is drawn at (1 when left out); below FAR_K the stage is far, as the board's is. */
  zoom?: number;
  /** What the conditions table says about each card (its NEW or updates tab), by board number. */
  facts?: (n: ViewNode) => CardConditions;
  /** The container's fresh pill counts (freshCards flag), keyed by its own id. */
  fresh?: ReadonlyMap<string, FreshCount>;
  /** Called once drawn, for a sample that shows a hover or focus look. */
  then?: (host: HTMLElement, drawing: Drawing) => void;
}

const PAD = 24;
const pending: (() => void)[] = [];

/** Draw every mini board made so far; main.ts calls it once the gallery is in the document. */
export const drawMiniBoards = (): void => pending.splice(0).forEach((draw) => draw());

const svg = (cls: string) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('class', cls);
  s.setAttribute('aria-hidden', 'true');
  return s;
};

/** One container (`region`) of `board`, drawn as the board draws it. */
export function miniBoard(board: { view: View; state: BoardState }, region: string, o: MiniOptions): HTMLElement {
  const nodes = board.view.nodes.filter((n) => n.region === region);
  const ids = new Set(nodes.map((n) => n.id));
  const as = (id: string) => `${id}${o.suffix ?? ''}`;
  const view: View = {
    ...board.view, regions: board.view.regions.filter((r) => r.id === region).map((r) => ({ ...r, id: as(r.id) })),
    nodes: nodes.map((n) => ({ ...n, id: as(n.id), region: as(n.region) })),
    links: board.view.links.filter((l) => ids.has(l.from) && ids.has(l.to)).map((l) => ({ ...l, from: as(l.from), to: as(l.to) })),
  };
  const stage = el('div', 'g-mini vb-ground');
  const world = el('div', 'vb-world no-anim');
  world.dataset.wireLayers = '';
  const [regions, cards, marks] = [el('div', 'vb-regions'), el('div', 'vb-cards'), el('div', 'vb-link-marks')];
  cards.setAttribute('role', 'list');
  cards.setAttribute('aria-label', o.label);
  marks.setAttribute('role', 'group');
  marks.setAttribute('aria-label', 'Link labels');
  marks.hidden = true;
  const [wires, wiresTop] = [svg('vb-wires'), svg('vb-wires vb-wires-top')];
  world.append(regions, wires, cards, wiresTop, marks);
  stage.append(world);
  const k = o.zoom ?? 1;
  const vp = new Viewport(stage, world, k < FAR_K);
  const drawing = createDrawing({
    els: { stage, world, regions, cards, wires, wiresTop, marks }, vp, sizing: true, access: false, layers: true,
    labels: o.labels === true, widthsControl: o.widths === true, align: () => o.align ?? 'start',
    data: () => ({ head: 0, view, state: board.state, versions: {}, access: { requests: [], holders: {} } }),
    hidden: () => new Set(), focus: () => null, selected: () => false, insets: () => new Map(), owed: () => new Set(),
    facts: o.facts ?? (() => ({})), replies: () => [],
    fresh: () => new Map([...(o.fresh ?? [])].map(([id, c]) => [as(id), c])),
  });
  pending.push(() => {
    drawing.draw(true);
    const b = drawing.layout!.bounds;
    Object.assign(vp, { x: PAD - b.x * k, y: PAD - b.y * k, k });
    vp.apply();
    stage.style.height = `${Math.ceil(b.h * k + 2 * PAD)}px`;
    stage.style.width = `${Math.ceil(b.w * k + 2 * PAD)}px`;
    drawing.viewMoved(); // measured against the stage's size now, no card is off screen
    o.then?.(stage, drawing);
  });
  return stage;
}
