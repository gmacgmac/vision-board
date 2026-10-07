// Connectors, lane bands and link labels in the stage's SVG, redrawn one link at a time
// (N12_FE_01, performance.md approach 2): every route is worked out (pure and cheap), and only a
// connector whose path, label or look changed is written. A link's route changes when a box it
// touches moved, or when a neighbour on the same side of a card moved its port. The SVG's children
// stay in the order a full draw writes them: lanes, then connectors, then labels, each in link order.
// With the wireLayers flag (D-032) the page puts this SVG behind frames and cards, and `top`, an SVG
// above the cards, repeats the focused card's connectors.
import type { BoardLayout, Route } from '../../../../packages/layout/src/index.ts';
import { esc } from '../../../../packages/ui/src/index.ts';
import { work } from './work.ts';

const NS = 'http://www.w3.org/2000/svg';

const marker = (id: string) =>
  `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9z"/></marker>`;

interface Drawn { path: SVGPathElement; label: SVGTextElement | null; look: string }

export interface Wires {
  /** Draw `layout`'s connectors; `focus` is the card whose links are highlighted. */
  draw(layout: BoardLayout, focus: string | null): void;
  clear(): void;
}

const keyOf = (r: Route) => `${r.from}>${r.to}`;

export function createWires(svg: SVGSVGElement, top?: SVGSVGElement): Wires {
  let groups: { lanes: SVGGElement; paths: SVGGElement; labels: SVGGElement } | null = null;
  let lanesSrc = '';
  let topSrc = '';
  let size = '';
  const drawn = new Map<string, Drawn>();

  function frame() {
    svg.innerHTML = `<defs>${marker('arrow')}${marker('arrow-hot')}</defs><g class="vb-lanes"></g><g></g><g></g>`;
    const [lanes, paths, labels] = [...svg.querySelectorAll<SVGGElement>(':scope > g')] as [SVGGElement, SVGGElement, SVGGElement];
    lanesSrc = topSrc = '';
    size = '';
    drawn.clear();
    return { lanes, paths, labels };
  }

  /** The focused card's connectors and labels, drawn again above the cards. */
  const topOf = (routes: Route[]) => routes.map((r) =>
    `<path class="vb-wire hot" d="${r.d}" marker-end="url(#arrow-hot)"/>`
    + (r.label ? `<text class="vb-wire-label" x="${r.mid.x}" y="${r.mid.y - 6}" text-anchor="middle">${esc(r.label)}</text>` : '')).join('');

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

  return {
    draw(layout, focus) {
      groups ??= frame();
      const b = layout.bounds;
      const wh = `${Math.ceil(b.x + b.w + 40)}x${Math.ceil(b.y + b.h + 40)}`;
      if (wh !== size) {
        svg.setAttribute('width', String(Math.ceil(b.x + b.w + 40)));
        svg.setAttribute('height', String(Math.ceil(b.y + b.h + 40)));
        size = wh;
      }
      const lanes = lanesOf(layout);
      if (lanes !== lanesSrc) groups.lanes.innerHTML = lanesSrc = lanes;
      const hot = (r: Route) => focus !== null && (r.from === focus || r.to === focus);
      if (top) {
        const src = topOf(layout.routes.filter(hot));
        if (src !== topSrc) top.innerHTML = topSrc = src;
      }
      const live = new Set(layout.routes.map(keyOf));
      for (const [key, d] of drawn) {
        if (live.has(key)) continue;
        d.path.remove();
        d.label?.remove();
        drawn.delete(key);
      }
      let prevPath: Element | null = null;
      let prevLabel: Element | null = null;
      for (const r of layout.routes) {
        const key = keyOf(r);
        const h = hot(r);
        const look = `${r.d}|${h}|${r.label ?? ''}|${r.mid.x},${r.mid.y}`;
        let d = drawn.get(key);
        if (!d) {
          d = { path: document.createElementNS(NS, 'path'), label: null, look: '' };
          drawn.set(key, d);
        }
        if (d.look !== look) {
          d.path.setAttribute('class', `vb-wire${h ? ' hot' : ''}`);
          d.path.setAttribute('d', r.d);
          d.path.setAttribute('marker-end', `url(#${h ? 'arrow-hot' : 'arrow'})`);
          if (r.label) {
            d.label ??= document.createElementNS(NS, 'text');
            d.label.setAttribute('class', 'vb-wire-label');
            d.label.setAttribute('x', String(r.mid.x));
            d.label.setAttribute('y', String(r.mid.y - 6));
            d.label.setAttribute('text-anchor', 'middle');
            d.label.textContent = r.label;
          } else {
            d.label?.remove();
            d.label = null;
          }
          d.look = look;
          work.linksRedrawn += 1;
        }
        keep(groups.paths, d.path, prevPath);
        prevPath = d.path;
        if (d.label) {
          keep(groups.labels, d.label, prevLabel);
          prevLabel = d.label;
        }
      }
    },
    clear() {
      groups = null;
      svg.innerHTML = '';
      if (top) top.innerHTML = topSrc = '';
      drawn.clear();
    },
  };
}
