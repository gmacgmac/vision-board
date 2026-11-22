// Timeline pattern, the template (D-105; PLAN decisions 8-12, § Design review 587-594): one container's timeline as SVG
// markup, from the geometry the layout returns (`#format` `TimelineDrawing`). The line with its arrow drawn as a path
// (no marker ids, so it never depends on the wires layer's defs), the same-date bands behind it, the stems, the years on
// the line in a gap cut from it, and a dot per dated node in the node's colour, its kind's or its tone's line. Hidden from
// assistive technology: the dates are on the nodes. Every size but the geometry is a token (timeline.css); colours by
// kind and tone are set in place by timeline-apply.ts (CSSOM, never a style attribute). It scales with the board as part
// of the world (ZOOM_RULES.world). Pure.
import type { Kind, Point, Tone, TimelineDot, TimelineDrawing } from '#format';
import { esc } from '../markdown/inline.ts';

/** How a dated node colours its dot: its kind, and its tone if it has one. */
export interface TimelineLook { kind: Kind; tone?: Tone | undefined }

/** The arrowhead at the line's end: its length along the line and its half width, in world pixels (the room the layout
 *  leaves past the last dot is BE_01's). */
export const TIMELINE_ARROW = { length: 9, half: 6 } as const;

const num = (v: number): string => String(Math.round(v * 100) / 100);
const pt = (p: Point): string => `${num(p.x)} ${num(p.y)}`;
const seg = (a: Point, b: Point): string => `M${pt(a)}L${pt(b)}`;
const same = (a: Point, b: Point): boolean => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;

/** The line, stopping where its arrowhead starts, and the arrowhead, its tip at `to`. */
function lineAndArrow({ from, to }: TimelineDrawing['line']): string {
  const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const [ux, uy] = [(to.x - from.x) / len, (to.y - from.y) / len];
  const base = { x: to.x - ux * TIMELINE_ARROW.length, y: to.y - uy * TIMELINE_ARROW.length };
  const side = (s: number): Point => ({ x: base.x - uy * TIMELINE_ARROW.half * s, y: base.y + ux * TIMELINE_ARROW.half * s });
  return `<path class="vb-timeline-line" d="${seg(from, base)}"/>`
    + `<path class="vb-timeline-arrow" d="M${pt(to)}L${pt(side(1))}L${pt(side(-1))}Z"/>`;
}

/** A dot's colour hooks: its kind, and its tone as written (a name or a hue); timeline-apply.ts turns them into colour. */
function dotLook(look: TimelineLook | undefined): string {
  if (!look) return '';
  return ` data-kind="${esc(look.kind)}"` + (look.tone === undefined ? '' : ` data-tone="${esc(String(look.tone))}"`);
}

/** The line's own parts, in the coordinates `drawing` is in: the same-date bands, the line with its arrow, the years. */
export function timelineLineMarkup(drawing: TimelineDrawing): { bands: string; line: string; years: string } {
  const { line, years, bands, direction } = drawing;
  // Across, the first year starts at the line's start; every other year (and every year run down) is centred on its point.
  return {
    bands: bands.map((b) => `<path class="vb-timeline-band" d="${seg(b.from, b.to)}"/>`).join(''),
    line: lineAndArrow(line),
    years: years.map((y) => {
      const anchor = direction === 'across' && same(y.at, line.from) ? 'start' : 'middle';
      // The halo that cuts the year's gap from the line is a text of its own, drawn first: one text with
      // `paint-order: stroke` lets WebKit paint each letter's halo over the letter before it.
      const text = (cls: string) => `<text class="${cls}" x="${num(y.at.x)}" y="${num(y.at.y)}" text-anchor="${anchor}">${esc(y.year)}</text>`;
      return text('vb-timeline-year-halo') + text('vb-timeline-year');
    }).join(''),
  };
}

/** One dated node's stem and dot, in the coordinates `dot` is in. */
export function timelineDotMarkup(dot: TimelineDot, look: TimelineLook | undefined): { stem: string; dot: string } {
  return {
    stem: `<path class="vb-timeline-stem" d="${seg(dot.stem.from, dot.stem.to)}"/>`,
    dot: `<circle class="vb-timeline-dot" cx="${num(dot.at.x)}" cy="${num(dot.at.y)}" data-node="${esc(dot.id)}" data-side="${dot.side}"${dotLook(look)}/>`,
  };
}

/** The SVG for one container's timeline (`drawing` in the coordinates it is drawn in; `look` answers each dot's node).
 *  The page draws the same parts in groups of their own, so the dots move with their cards (wires.ts). */
export function timelineMarkup(drawing: TimelineDrawing, look: (id: string) => TimelineLook | undefined): string {
  const { bands, line, years } = timelineLineMarkup(drawing);
  const parts = drawing.dots.map((d) => timelineDotMarkup(d, look(d.id)));
  return `<g class="vb-timeline" data-direction="${drawing.direction}" aria-hidden="true">${bands}${line}${parts.map((p) => p.stem).join('')}${years}${parts.map((p) => p.dot).join('')}</g>`;
}
