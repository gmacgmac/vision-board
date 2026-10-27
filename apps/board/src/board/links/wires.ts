// Connectors, lane bands and link labels in the stage's SVG, redrawn one link at a time
// (N12_FE_01, performance.md approach 2): every route is worked out (pure and cheap), and only a
// connector whose path, label or look changed is written. A link's route changes when a box it
// touches moved, or when a neighbour on the same side of a card moved its port. The SVG's children
// stay in the order a full draw writes them: lanes, then connectors, then labels, each in link order.
// With the wireLayers flag (D-032) the page puts this SVG behind frames and cards, and `top`, an SVG
// above the cards, repeats the focused card's connectors. With the linkLabels flag a label sits on
// its line where the layout found it room (link-labels.ts), else a marker does (link-marks.ts, in
// `marks`, a layer outside this SVG); off, every label is drawn at the middle of its line.
import type { BoardLayout, Route } from '#layout';
import { esc } from '#ui';
import { fitLabel, labelElement, labelMarkup, tagAt } from './link-labels.ts';
import { createLinkMarks } from './link-marks.ts';
import { work } from '../work.ts';

const NS = 'http://www.w3.org/2000/svg';

const marker = (id: string) =>
  `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9z"/></marker>`;

interface Drawn { path: SVGPathElement; label: SVGGElement | null; look: string }

export interface Wires {
  /** Draw `layout`'s connectors; `focus` is the card whose links are highlighted. */
  draw(layout: BoardLayout, focus: string | null): void;
  clear(): void;
}

const keyOf = (r: Route) => `${r.from}>${r.to}`;

/** `top`: the layer above the cards (wireLayers flag); `labels`: the linkLabels flag, with `marks`, the
 *  markers' layer. */
export function createWires(svg: SVGSVGElement, top?: SVGSVGElement, labels?: { marks: HTMLElement }, ids = ''): Wires {
  const [arrow, arrowHot] = [`${ids}arrow`, `${ids}arrow-hot`];
  const on = !!labels;
  const marks = labels && createLinkMarks(labels.marks);
  let groups: { lanes: SVGGElement; paths: SVGGElement; labels: SVGGElement } | null = null;
  let lanesSrc = '';
  let topSrc = '';
  let size = '';
  const drawn = new Map<string, Drawn>();

  function frame() {
    svg.innerHTML = `<defs>${marker(arrow)}${marker(arrowHot)}</defs><g class="vb-lanes"></g><g></g><g></g>`;
    const [lanes, paths, labels] = [...svg.querySelectorAll<SVGGElement>(':scope > g')] as [SVGGElement, SVGGElement, SVGGElement];
    lanesSrc = topSrc = '';
    size = '';
    drawn.clear();
    return { lanes, paths, labels };
  }

  /** The focused card's connectors and labels, drawn again above the cards. */
  const topOf = (routes: Route[]) => routes.map((r) => {
    const at = tagAt(r, on);
    return `<path class="vb-wire hot" d="${r.d}" marker-end="url(#${arrowHot})"/>` + (at ? labelMarkup(r.label!, at, on) : '');
  }).join('');

  function lanesOf(layout: BoardLayout): string {
    return layout.regions.flatMap((r) => (r.lanes ?? []).map((l, i) =>
      `<rect class="vb-lane${i % 2 ? ' odd' : ''}" x="${r.box.x + 8}" y="${l.y}" width="${r.box.w - 16}" height="${l.h}" rx="8"/>`
      + `<text class="vb-lane-label" x="${r.box.x + 24}" y="${l.y + 22}">${esc(l.name)}</text>`)).join('');
  }

  /** Put `el` right after `prev` in `parent` (first when `prev` is null), moving it only if needed. */
  const keep = (parent: Element, el: Element, prev: Element | null) => {
    const want = prev ? prev.nextElementSibling : parent.firstElementChild;
    if (want !== el) parent.insertBefore(el, want);
  };

  /** The SVG as wide and tall as the layout's bounds plus its margin. */
  function fitSize(layout: BoardLayout) {
    const b = layout.bounds;
    const wh = `${Math.ceil(b.x + b.w + 40)}x${Math.ceil(b.y + b.h + 40)}`;
    if (wh === size) return;
    svg.setAttribute('width', String(Math.ceil(b.x + b.w + 40)));
    svg.setAttribute('height', String(Math.ceil(b.y + b.h + 40)));
    size = wh;
  }

  /** Remove the connectors (and labels) of links the layout no longer has. */
  function dropGone(routes: Route[]) {
    const live = new Set(routes.map(keyOf));
    for (const [key, d] of drawn) {
      if (live.has(key)) continue;
      d.path.remove();
      d.label?.remove();
      drawn.delete(key);
    }
  }

  /** One link's connector and label, written only when its look changed; the label it drew, if it needs fitting. */
  function paint(r: Route, h: boolean): SVGGElement | null {
    const key = keyOf(r);
    const at = tagAt(r, on);
    const look = `${r.d}|${h}|${r.label ?? ''}|${at ? `${at.x},${at.y}` : ''}`;
    let d = drawn.get(key);
    if (!d) {
      d = { path: document.createElementNS(NS, 'path'), label: null, look: '' };
      drawn.set(key, d);
    }
    if (d.look === look) return null;
    d.path.setAttribute('class', `vb-wire${h ? ' hot' : ''}`);
    d.path.setAttribute('d', r.d);
    d.path.setAttribute('marker-end', `url(#${h ? arrowHot : arrow})`);
    let fresh: SVGGElement | null = null;
    if (at) {
      d.label = labelElement(r.label!, at, on, d.label ?? undefined);
      fresh = d.label;
    } else {
      d.label?.remove();
      d.label = null;
    }
    d.look = look;
    work.linksRedrawn += 1;
    return fresh;
  }

  return {
    draw(layout, focus) {
      groups ??= frame();
      fitSize(layout);
      const lanes = lanesOf(layout);
      if (lanes !== lanesSrc) groups.lanes.innerHTML = lanesSrc = lanes;
      const hot = (r: Route) => focus !== null && (r.from === focus || r.to === focus);
      if (top) {
        const src = topOf(layout.routes.filter(hot));
        if (src !== topSrc) top.innerHTML = topSrc = src;
      }
      dropGone(layout.routes);
      let prevPath: Element | null = null;
      let prevLabel: Element | null = null;
      const fit: SVGGElement[] = [];
      for (const r of layout.routes) {
        const label = paint(r, hot(r));
        if (label) fit.push(label);
        const d = drawn.get(keyOf(r))!;
        keep(groups.paths, d.path, prevPath);
        prevPath = d.path;
        if (d.label) {
          keep(groups.labels, d.label, prevLabel);
          prevLabel = d.label;
        }
      }
      // Reads after the writes: a label the font runs wider than its tag is squeezed into it.
      if (on) fit.forEach(fitLabel);
      marks?.draw(layout.routes);
    },
    clear() {
      groups = null;
      svg.innerHTML = '';
      if (top) top.innerHTML = topSrc = '';
      drawn.clear();
      marks?.clear();
    },
  };
}
