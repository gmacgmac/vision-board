// The gallery's pictures (app-cards FE_03, D-048): a wide flow diagram and a tall phone screen, and two
// svg pictures (D-064, SVG_01: a plan sized by width and height, three pulsing dots sized by viewBox), saved
// into a project's images folder (`gallery/`, `ledgerFiles`) as an agent would save them. servers.ts writes them
// into each worker's main project before its server starts, so the gallery's image section shows real
// files through the real route; its paths are those apps/board/src/gallery/image-view-section.ts
// names. Drawn here from plain shapes (`pngOf`).
import type { Rgb } from '#board/testing';
import { pngOf, put } from '#board/testing';

/** A rounded box of colour `c` (`r` its corner radius), or a right-pointing arrow head when `tip`. */
interface Shape { x: number; y: number; w: number; h: number; c: Rgb; r?: number; tip?: true }

const inside = (s: Shape, px: number, py: number): boolean => {
  if (px < s.x || py < s.y || px >= s.x + s.w || py >= s.y + s.h) return false;
  if (s.tip) return Math.abs(py - (s.y + s.h / 2)) <= (s.h / 2) * (1 - (px - s.x) / s.w);
  const r = s.r ?? 0;
  const dx = Math.max(s.x + r - px, px - (s.x + s.w - r), 0);
  const dy = Math.max(s.y + r - py, py - (s.y + s.h - r), 0);
  return dx * dx + dy * dy <= r * r;
};

/** A picture `w` by `h` of `shapes` (the last one on top) on `ground`. */
function picture(w: number, h: number, ground: Rgb, shapes: Shape[]): Buffer {
  return pngOf(w, h, (x, y) => {
    for (let i = shapes.length - 1; i >= 0; i -= 1) if (inside(shapes[i]!, x, y)) return shapes[i]!.c;
    return ground;
  });
}

const WHITE: Rgb = [255, 255, 255];
const LINE: Rgb = [214, 216, 222];
const TEXT: Rgb = [176, 180, 190];

/** One step of the flow: a white box with a coloured head and three lines of "text". */
const step = (x: number, c: Rgb): Shape[] => [
  { x: x - 3, y: 177, w: 286, h: 246, c: LINE, r: 22 }, { x, y: 180, w: 280, h: 240, c: WHITE, r: 20 },
  { x, y: 180, w: 280, h: 64, c, r: 20 }, { x, y: 220, w: 280, h: 24, c },
  { x: x + 28, y: 278, w: 200, h: 16, c: TEXT, r: 8 }, { x: x + 28, y: 314, w: 160, h: 16, c: TEXT, r: 8 },
  { x: x + 28, y: 350, w: 120, h: 16, c: TEXT, r: 8 },
];
const arrow = (x: number): Shape[] => [{ x, y: 296, w: 70, h: 8, c: [120, 124, 138] }, { x: x + 64, y: 280, w: 32, h: 40, c: [120, 124, 138], tip: true }];

/** The sign-in flow: three steps and the arrows between them, 1200 by 600. */
export const flow = (): Buffer => picture(1200, 600, [244, 245, 247], [
  ...step(80, [52, 113, 208]), ...arrow(372), ...step(460, [31, 143, 126]), ...arrow(752), ...step(840, [212, 19, 138]),
]);

/** A phone's screen: a bar, a picture, a heading, list rows and a button, 540 by 1080. */
export const phone = (): Buffer => picture(540, 1080, [248, 248, 250], [
  { x: 0, y: 0, w: 540, h: 120, c: [24, 24, 27] }, { x: 32, y: 48, w: 180, h: 28, c: [90, 90, 100], r: 14 },
  { x: 32, y: 160, w: 476, h: 300, c: [52, 113, 208], r: 28 }, { x: 32, y: 500, w: 300, h: 36, c: [60, 60, 70], r: 18 },
  ...[580, 680, 780].flatMap((y): Shape[] => [
    { x: 32, y, w: 476, h: 80, c: WHITE, r: 16 }, { x: 52, y: y + 20, w: 40, h: 40, c: [31, 143, 126], r: 20 },
    { x: 112, y: y + 22, w: 260, h: 14, c: TEXT, r: 7 }, { x: 112, y: y + 46, w: 180, h: 12, c: LINE, r: 6 },
  ]),
  { x: 32, y: 940, w: 476, h: 88, c: [212, 19, 138], r: 44 },
]);

const SVG_NS = 'xmlns="http://www.w3.org/2000/svg"';
/** One step of a plan as svg: a white box with a coloured head and two bars of "text". */
const svgStep = (x: number, c: string) =>
  `<rect x="${x}" y="70" width="112" height="100" rx="10" fill="#fff" stroke="#d6d8de" stroke-width="2"/>` +
  `<path d="M${x} 80a10 10 0 0 1 10-10h92a10 10 0 0 1 10 10v16h-112z" fill="${c}"/>` +
  `<rect x="${x + 14}" y="116" width="76" height="10" rx="5" fill="#b0b4be"/><rect x="${x + 14}" y="138" width="54" height="10" rx="5" fill="#b0b4be"/>`;
const svgArrow = (x: number) => `<path d="M${x} 120h26" stroke="#787c8a" stroke-width="4"/><path d="M${x + 24} 110l14 10-14 10z" fill="#787c8a"/>`;

/** A plan in three steps, as an agent would draw it in svg: sized by its width and height, 480 by 240, no text (fonts differ by machine). */
export const planSvg = (): string => `<svg ${SVG_NS} width="480" height="240" viewBox="0 0 480 240">` +
  `<rect width="480" height="240" rx="16" fill="#f4f5f7"/>${svgStep(32, '#3471d0')}${svgArrow(150)}${svgStep(184, '#1f8f7e')}${svgArrow(302)}${svgStep(336, '#d4138a')}</svg>`;

/** Three dots that pulse in turn, sized by its viewBox alone: a short animation (three runs of 0.6 s,
 * back to its first frame) written inside `prefers-reduced-motion: no-preference`, as the skill asks. */
export const pulseSvg = (): string => `<svg ${SVG_NS} viewBox="0 0 300 100">` +
  '<style>circle{fill:#3471d0;opacity:.35}@media (prefers-reduced-motion:no-preference){circle{animation:p .6s ease-in-out 3 both}' +
  'circle:nth-of-type(2){animation-delay:.2s}circle:nth-of-type(3){animation-delay:.4s}}@keyframes p{50%{opacity:1}}</style>' +
  '<rect width="300" height="100" rx="12" fill="#f4f5f7"/><circle cx="110" cy="50" r="14"/><circle cx="150" cy="50" r="14"/><circle cx="190" cy="50" r="14"/></svg>';

/** The gallery's paths in the images folder (a subfolder, as an agent may use one). */
export const GALLERY_IMAGES = { flow: 'gallery/flow.png', phone: 'gallery/phone.png', plan: 'gallery/plan.svg', pulse: 'gallery/pulse.svg' } as const;

export function writeGalleryImages(project: string): void {
  put(project, GALLERY_IMAGES.flow, flow());
  put(project, GALLERY_IMAGES.phone, phone());
  put(project, GALLERY_IMAGES.plan, planSvg());
  put(project, GALLERY_IMAGES.pulse, pulseSvg());
}
