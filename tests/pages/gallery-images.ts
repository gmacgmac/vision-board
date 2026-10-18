// The gallery's pictures (app-cards FE_03, D-048): a wide flow diagram and a tall phone screen, saved
// into a project's `.visionboard/images/gallery/` as an agent would save them. playwright.config.ts
// runs this on the served project before its server starts (`node tests/pages/gallery-images.ts
// <project>`), so the gallery's image section shows real files through the real route; its paths are
// those apps/board/src/gallery/image-view-section.ts names. Drawn here from plain shapes (`pngOf`).
import { fileURLToPath } from 'node:url';
import type { Rgb } from '../../apps/board/tests/images-support.ts';
import { pngOf, put } from '../../apps/board/tests/images-support.ts';

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

/** The gallery's paths in the images folder (a subfolder, as an agent may use one). */
export const GALLERY_IMAGES = { flow: 'gallery/flow.png', phone: 'gallery/phone.png' } as const;

export function writeGalleryImages(project: string): void {
  put(project, GALLERY_IMAGES.flow, flow());
  put(project, GALLERY_IMAGES.phone, phone());
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writeGalleryImages(process.argv[2]!);
