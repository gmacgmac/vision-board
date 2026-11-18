// Timeline pattern, the template (D-105; PLAN decisions 8-12, § Design review 587-594): one container's timeline as SVG
// markup, from the geometry the layout returns (`#format` `TimelineDrawing`). The line with its arrow drawn as a path
// (no marker ids, so it never depends on the wires layer's defs), the same-date bands behind it, the stems, the years on
// the line in a gap cut from it, and a dot per dated node in the node's colour, its kind's or its tone's line. Hidden from
// assistive technology: the dates are on the nodes. Every size but the geometry is a token (timeline.css); colours by
// kind and tone are set in place by timeline-apply.ts (CSSOM, never a style attribute). It scales with the board as part
// of the world (ZOOM_RULES.world). Pure.
import type { Kind, Point, Tone, TimelineDrawing } from '#format';
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

/** The SVG for one container's timeline (`drawing` in the coordinates it is drawn in; `look` answers each dot's node). */
export function timelineMarkup(drawing: TimelineDrawing, look: (id: string) => TimelineLook | undefined): string {
  const { line, dots, years, bands, direction } = drawing;
  const bandsSvg = bands.map((b) => `<path class="vb-timeline-band" d="${seg(b.from, b.to)}"/>`).join('');
  const stems = dots.map((d) => `<path class="vb-timeline-stem" d="${seg(d.stem.from, d.stem.to)}"/>`).join('');
  // Across, the first year starts at the line's start; every other year (and every year run down) is centred on its point.
  const yearsSvg = years.map((y) => {
    const anchor = direction === 'across' && same(y.at, line.from) ? 'start' : 'middle';
    return `<text class="vb-timeline-year" x="${num(y.at.x)}" y="${num(y.at.y)}" text-anchor="${anchor}">${esc(y.year)}</text>`;
  }).join('');
  const dotsSvg = dots.map((d) => `<circle class="vb-timeline-dot" cx="${num(d.at.x)}" cy="${num(d.at.y)}" data-node="${esc(d.id)}" data-side="${d.side}"${dotLook(look(d.id))}/>`).join('');
  return `<g class="vb-timeline" data-direction="${direction}" aria-hidden="true">${bandsSvg}${lineAndArrow(line)}${stems}${yearsSvg}${dotsSvg}</g>`;
}
