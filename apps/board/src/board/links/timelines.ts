// Each container's timeline on the board (D-105; the timeline set's FE_02), in the wires layer's `vb-timelines` group,
// from the geometry the layout returns (`RegionBox.timeline`) through `#ui`'s template pieces. It moves as the cards
// do (PLAN § Design review "After FE_02" (b)): the line, its bands and years are drawn in their container's own
// coordinates in a group placed at the container's origin, and each dated node's stem and dot in that node's own
// coordinates in a group placed where the node is; the groups stay from draw to draw and only their place changes, so
// they glide with the cards' and frames' transform transition (board.css) and never run ahead. A part's markup is
// written again only when it changes. Every value is escaped by the template.
import type { Point, TimelineDrawing } from '#format';
import type { BoardLayout, Box } from '#layout';
import { shiftTimeline } from '#layout';
import type { TimelineLook } from '#ui';
import { applyTimelineLook, timelineDotMarkup, timelineLineMarkup } from '#ui';

const NS = 'http://www.w3.org/2000/svg';

interface Part { el: SVGGElement; src: string; at: string }

export interface Timelines {
  draw(layout: BoardLayout): void;
  clear(): void;
}

const back = (p: Point): Point => ({ x: -p.x, y: -p.y });
/** A group's place, through CSSOM (the page's CSP refuses a style attribute), so a change glides. */
function place(part: Part, at: Point): void {
  const t = `translate(${at.x}px, ${at.y}px)`;
  if (part.at === t) return;
  part.el.style.transform = t;
  part.at = t;
}

/** `host`: the wires layer's `vb-timelines` group; `look`: a dot's node, its kind and tone. */
export function createTimelines(host: SVGGElement, look: (id: string) => TimelineLook | undefined): Timelines {
  const lines = new Map<string, Part>();
  const dots = new Map<string, Part>();

  /** The part for `key` in `kept`, made (hidden from assistive technology, as the template's group is) when new. */
  function partOf(kept: Map<string, Part>, key: string): Part {
    let part = kept.get(key);
    if (!part) {
      const el = document.createElementNS(NS, 'g');
      el.setAttribute('class', 'vb-timeline');
      el.setAttribute('aria-hidden', 'true');
      part = { el, src: '', at: '' };
      kept.set(key, part);
    }
    return part;
  }
  /** Write `src` into `part` when it changed; true when it did. */
  function write(part: Part, src: string, attrs: Record<string, string>): boolean {
    for (const [k, v] of Object.entries(attrs)) if (part.el.getAttribute(k) !== v) part.el.setAttribute(k, v);
    if (part.src === src) return false;
    part.el.innerHTML = src;
    part.src = src;
    return true;
  }
  const drop = (kept: Map<string, Part>, live: Set<string>) => {
    for (const [key, part] of kept) if (!live.has(key)) { part.el.remove(); kept.delete(key); }
  };

  function lineOf(id: string, origin: Point, t: TimelineDrawing): Part {
    const part = partOf(lines, id);
    const { bands, line, years } = timelineLineMarkup(shiftTimeline(t, back(origin)));
    write(part, bands + line + years, { 'data-region': id, 'data-direction': t.direction });
    place(part, origin);
    return part;
  }
  function dotOf(region: string, dot: TimelineDrawing['dots'][number], box: Box): Part {
    const part = partOf(dots, dot.id);
    const local = shiftTimeline({ direction: 'across', line: { from: dot.at, to: dot.at }, dots: [dot], years: [], bands: [] }, back(box)).dots[0]!;
    const { stem, dot: circle } = timelineDotMarkup(local, look(dot.id));
    if (write(part, stem + circle, { 'data-region': region, 'data-node': dot.id })) applyTimelineLook(part.el);
    place(part, box);
    return part;
  }

  return {
    draw(layout) {
      const order: Part[] = [];
      const dotted: Part[] = [];
      for (const r of layout.regions) {
        if (!r.timeline) continue;
        order.push(lineOf(r.id, r.origin, r.timeline));
        for (const d of r.timeline.dots) {
          const box = layout.nodes.get(d.id);
          if (box) dotted.push(dotOf(r.id, d, box));
        }
      }
      drop(lines, new Set(layout.regions.filter((r) => r.timeline).map((r) => r.id)));
      drop(dots, new Set(dotted.map((p) => p.el.getAttribute('data-node')!)));
      // Lines first, then every dot over them, each in drawn order; a kept group is moved only when out of order, so a
      // gliding one keeps gliding.
      let prev: Element | null = null;
      for (const part of [...order, ...dotted]) {
        const want: Element | null = prev ? prev.nextElementSibling : host.firstElementChild;
        if (want !== part.el) host.insertBefore(part.el, want);
        prev = part.el;
      }
    },
    clear() {
      lines.clear();
      dots.clear();
      host.replaceChildren();
    },
  };
}
