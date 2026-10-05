// Draws a laid-out board. Elements are created once per view version and then updated in
// place (attributes, transforms), so focus and CSS transitions survive every re-layout.
import type { NodeSize, View, ViewNode } from '../../../../packages/format/src/index.ts';
import type { BoardLayout, Size } from '../../../../packages/layout/src/index.ts';
import type { AccessHolder, BoardState } from '../../../../packages/actions/src/index.ts';
import type { NodeTemplateOptions, VbNodeElement, VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { esc, nodeState, regionState } from '../../../../packages/ui/src/index.ts';

/** Items first in number order, then the rest: DOM order is tab order is reading order. */
export function readingOrder(view: View): ViewNode[] {
  return view.nodes
    .map((n, i) => ({ n, i }))
    .sort((a, b) => (a.n.n ?? Infinity) - (b.n.n ?? Infinity) || a.i - b.i)
    .map((x) => x.n);
}

/** One <vb-node> per node, in reading order. The element renders its own markup and state. */
export function buildCards(host: HTMLElement, view: View, opts: NodeTemplateOptions = {}): Map<string, VbNodeElement> {
  host.replaceChildren();
  const cards = new Map<string, VbNodeElement>();
  for (const n of readingOrder(view)) {
    const el = document.createElement('vb-node') as VbNodeElement;
    el.render(n, opts);
    host.append(el);
    cards.set(n.id, el);
  }
  return cards;
}

/** `tier` (the nodeSize flag) sets data-size, so call this before `measure`: height follows width. */
export function updateCard(el: VbNodeElement, n: ViewNode, s: BoardState, tier?: NodeSize): void {
  el.update(nodeState(n, s, tier));
}

export function measure(cards: Map<string, HTMLElement>): Map<string, Size> {
  for (const el of cards.values()) el.hidden = false;
  const sizes = new Map<string, Size>();
  for (const [id, el] of cards) sizes.set(id, { w: el.offsetWidth, h: el.offsetHeight });
  return sizes;
}

export function placeCards(cards: Map<string, HTMLElement>, layout: BoardLayout): void {
  for (const [id, el] of cards) {
    const b = layout.nodes.get(id);
    el.hidden = !b;
    if (b) el.style.transform = `translate(${b.x}px, ${b.y}px)`;
  }
}

/** One <vb-region> per region. The element renders its own frame; the page places it. */
export function buildRegions(host: HTMLElement, view: View): Map<string, VbRegionElement> {
  host.replaceChildren();
  const els = new Map<string, VbRegionElement>();
  for (const r of view.regions) {
    const el = document.createElement('vb-region') as VbRegionElement;
    el.render(r);
    host.append(el);
    els.set(r.id, el);
  }
  return els;
}

/** `holders` (the agentAccess flag): region id -> the agents that hold it, from `get_board`. */
export function placeRegions(
  els: Map<string, VbRegionElement>, layout: BoardLayout, view: View, s: BoardState,
  holders?: Readonly<Record<string, AccessHolder[]>>,
): void {
  const placed = new Set(layout.nodes.keys());
  for (const r of layout.regions) {
    const el = els.get(r.id);
    if (!el) continue;
    el.style.transform = `translate(${r.box.x}px, ${r.box.y}px)`;
    el.style.width = `${r.box.w}px`;
    el.style.height = `${r.box.h}px`;
    el.update(regionState(r, view, s, placed, holders?.[r.id]));
  }
}

/** Connectors, lane bands and link labels, as one SVG string. */
export function drawWires(svg: SVGSVGElement, layout: BoardLayout, focus: string | null): void {
  const b = layout.bounds;
  svg.setAttribute('width', String(Math.ceil(b.x + b.w + 40)));
  svg.setAttribute('height', String(Math.ceil(b.y + b.h + 40)));
  const lanes = layout.regions.flatMap((r) => (r.lanes ?? []).map((l, i) =>
    `<rect class="vb-lane${i % 2 ? ' odd' : ''}" x="${r.box.x + 8}" y="${l.y}" width="${r.box.w - 16}" height="${l.h}" rx="8"/>`
    + `<text class="vb-lane-label" x="${r.box.x + 24}" y="${l.y + 22}">${esc(l.name)}</text>`));
  const hot = (a: string, z: string) => focus !== null && (a === focus || z === focus);
  const paths = layout.routes.map((r) =>
    `<path class="vb-wire${hot(r.from, r.to) ? ' hot' : ''}" d="${r.d}" marker-end="url(#${hot(r.from, r.to) ? 'arrow-hot' : 'arrow'})"/>`);
  const labels = layout.routes.filter((r) => r.label).map((r) =>
    `<text class="vb-wire-label" x="${r.mid.x}" y="${r.mid.y - 6}" text-anchor="middle">${esc(r.label!)}</text>`);
  const marker = (id: string) =>
    `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9z"/></marker>`;
  svg.innerHTML = `<defs>${marker('arrow')}${marker('arrow-hot')}</defs>`
    + `<g class="vb-lanes">${lanes.join('')}</g><g>${paths.join('')}</g><g>${labels.join('')}</g>`;
}
