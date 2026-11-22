// Each container's timeline on the board (D-105; the timeline set's FE_02), in the wires layer, from the geometry the
// layout returns (`RegionBox.timeline`) through `#ui`'s template pieces. The line, its bands, years and each stem go in
// the `vb-timelines` group, beneath the links; each dot goes in the `vb-timeline-dots` group, the layer's last, above
// every link and label (FIX_04, the maintainer's look). The line, its bands and years are drawn in their container's
// own coordinates in a group placed at the container's origin, and each dated node's stem and dot, each in a group of
// its own, in that node's own coordinates in a group placed where the node is; the groups stay from draw to draw and
// only their place changes. While the cards glide to a new layout the timeline is hidden with the links and fades back
// where they land (board.css `.settling`; 2026-11-22, points 5-6). A part's markup is written again only when it
// changes. Every value is escaped by the template.
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
/** A group's place, by the SVG `transform` attribute: in the SVG's own units, as the links' path data is. A CSS
 *  transform on an SVG child is scaled again by WebKit's page zoom (Safari zoomed in, nclite at 110%), which moved the
 *  line off its cards. */
function place(part: Part, at: Point): void {
  const t = `translate(${at.x} ${at.y})`;
  if (part.at === t) return;
  part.el.setAttribute('transform', t);
  part.at = t;
}

/** `host`: the wires layer's `vb-timelines` group (lines and stems); `above`: its `vb-timeline-dots` group (the dots);
 *  `look`: a dot's node, its kind and tone. */
export function createTimelines(host: SVGGElement, above: SVGGElement, look: (id: string) => TimelineLook | undefined): Timelines {
  const lines = new Map<string, Part>();
  const stems = new Map<string, Part>();
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
  /** A dated node's stem and its dot, each in a group of its own (`stem` beneath the links, `dot` above them). */
  function dotOf(region: string, dot: TimelineDrawing['dots'][number], box: Box): { stem: Part; dot: Part } {
    const [stemPart, dotPart] = [partOf(stems, dot.id), partOf(dots, dot.id)];
    const local = shiftTimeline({ direction: 'across', line: { from: dot.at, to: dot.at }, dots: [dot], years: [], bands: [] }, back(box)).dots[0]!;
    const { stem, dot: circle } = timelineDotMarkup(local, look(dot.id));
    const attrs = { 'data-region': region, 'data-node': dot.id };
    write(stemPart, stem, attrs);
    if (write(dotPart, circle, attrs)) applyTimelineLook(dotPart.el);
    place(stemPart, box);
    place(dotPart, box);
    return { stem: stemPart, dot: dotPart };
  }
  /** `parts` as `into`'s children in this order; a kept group is moved only when out of order, so a gliding one keeps
   *  gliding. */
  function arrange(into: SVGGElement, parts: Part[]): void {
    let prev: Element | null = null;
    for (const part of parts) {
      const want: Element | null = prev ? prev.nextElementSibling : into.firstElementChild;
      if (want !== part.el) into.insertBefore(part.el, want);
      prev = part.el;
    }
  }

  return {
    draw(layout) {
      const order: Part[] = [];
      const stemmed: Part[] = [];
      const dotted: Part[] = [];
      for (const r of layout.regions) {
        if (!r.timeline) continue;
        order.push(lineOf(r.id, r.origin, r.timeline));
        for (const d of r.timeline.dots) {
          const box = layout.nodes.get(d.id);
          if (!box) continue;
          const made = dotOf(r.id, d, box);
          stemmed.push(made.stem);
          dotted.push(made.dot);
        }
      }
      drop(lines, new Set(layout.regions.filter((r) => r.timeline).map((r) => r.id)));
      const live = new Set(dotted.map((p) => p.el.getAttribute('data-node')!));
      drop(stems, live);
      drop(dots, live);
      arrange(host, [...order, ...stemmed]); // lines first, then every stem over them
      arrange(above, dotted);
    },
    clear() {
      lines.clear();
      stems.clear();
      dots.clear();
      host.replaceChildren();
      above.replaceChildren();
    },
  };
}
