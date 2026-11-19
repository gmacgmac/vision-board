// The print view (D-107, export-import-print PLAN decisions 8-9): what the board sets on its root before the host prints,
// and takes off after. A print stylesheet over the live page (styles/print.css) reads it: no header, strips, panels or
// menus; the scope, the whole board or one container, fitted to one page by a transform of the world (never enlarged);
// the containers' borders as chosen; colours kept. Nothing is drawn again: the cards, frames and links are the ones on
// screen. A container's print hides every other frame, card and link (`data-vb-print-out`). The world's transform, the
// zoom level's marks on the stage (`data-zoom`, `data-marks`), the zoom's own properties on the layers (`--vb-zoom`, the
// marks' growth) and the page's orientation are the print's own while it lasts, so a board printed zoomed out still prints
// its cards whole. Browser only, no sentence.
import type { View } from '#format';
import type { BoardLayout, Box } from '#layout';

/** The page's printable area in CSS px: the smaller of A4 and US Letter (210 × 279.4 mm), less print.css's 10 mm
 *  margins (190 × 259.4 mm at 96 px to the inch), less 4 px for rounding, so the fitted board is one page on either. */
export const PRINT_PAGE = { long: 976, short: 714 } as const;
/** Room round what is printed, so a card's marks that hang over its edge (D-099) and a frame's title are not cut. */
export const PRINT_PAD = 24;

/** What is printed, in board coordinates, and how: `scale` (at most 1) fits it to one page, `landscape` when wider than tall. */
export interface PrintFit { x: number; y: number; w: number; h: number; scale: number; landscape: boolean }

/** The fit of `box` to one page: padded by `pad`, turned to the page's longer side, shrunk to fit and never enlarged. */
export function printFit(box: Box, pad = PRINT_PAD): PrintFit {
  const [x, y, w, h] = [box.x - pad, box.y - pad, box.w + 2 * pad, box.h + 2 * pad];
  const landscape = w > h;
  const [pw, ph] = landscape ? [PRINT_PAGE.long, PRINT_PAGE.short] : [PRINT_PAGE.short, PRINT_PAGE.long];
  return { x, y, w, h, scale: Math.min(1, pw / w, ph / h), landscape };
}

/** What to print: one container (`region`) or, without it, the whole board; `border`, the containers' borders. */
export interface PrintScope { region?: string | undefined; border: boolean }

const OUT = 'data-vb-print-out';
/** The stage's zoom level marks (viewport.ts): the print shows the cards as at 100%, then shrinks them with the world. */
const LEVEL = ['data-zoom', 'data-marks'] as const;
const VARS = ['--vb-print-w', '--vb-print-h', '--vb-print-transform'] as const;
/** The zoom's own properties (viewport.ts, on the frames' and the cards' layers): as at 100% while the print lasts. */
const ZOOM = ['--vb-zoom', '--vb-mark-grow'] as const;

/** Set the print view for `scope` on `root`, over the board as `layout` and `view` draw it; what undoes it, or null when
 *  `scope` names a container the layout doesn't hold. */
export function preparePrint(root: HTMLElement, layout: BoardLayout, view: View, scope: PrintScope): (() => void) | null {
  const box = scope.region === undefined ? layout.bounds : layout.regions.find((r) => r.id === scope.region)?.box;
  if (!box) return null;
  const fit = printFit(box);
  const stage = root.querySelector<HTMLElement>('.vb-stage');
  const level = LEVEL.map((a) => [a, stage?.getAttribute(a) ?? null] as const);
  for (const [a] of level) stage?.removeAttribute(a);
  const layers = [...root.querySelectorAll<HTMLElement>('.vb-regions, .vb-cards')];
  const zoom = layers.map((el) => ZOOM.map((v) => el.style.getPropertyValue(v)));
  for (const el of layers) for (const v of ZOOM) el.style.setProperty(v, '1');
  Object.assign(root.dataset, { vbPrint: scope.region ?? 'board', vbPrintBorder: scope.border ? 'on' : 'off', vbPrintPage: fit.landscape ? 'landscape' : 'portrait' });
  root.style.setProperty('--vb-print-w', `${Math.ceil(fit.w * fit.scale)}px`);
  root.style.setProperty('--vb-print-h', `${Math.ceil(fit.h * fit.scale)}px`);
  root.style.setProperty('--vb-print-transform', `scale(${fit.scale}) translate(${-fit.x}px, ${-fit.y}px)`);
  const out = scope.region === undefined ? [] : outside(root, view, scope.region);
  for (const el of out) el.setAttribute(OUT, '');
  return () => {
    for (const el of out) el.removeAttribute(OUT);
    for (const v of VARS) root.style.removeProperty(v);
    delete root.dataset.vbPrint;
    delete root.dataset.vbPrintBorder;
    delete root.dataset.vbPrintPage;
    for (const [a, v] of level) if (v !== null) stage?.setAttribute(a, v);
    layers.forEach((el, i) => ZOOM.forEach((v, j) => (zoom[i]![j] ? el.style.setProperty(v, zoom[i]![j]!) : el.style.removeProperty(v))));
  };
}

/** Everything drawn that is not container `region`'s: the other frames, their cards, and every link with an end outside it
 *  (its path and its label, wires.ts `data-from`, `data-to`). */
function outside(root: HTMLElement, view: View, region: string): Element[] {
  const mine = new Set(view.nodes.filter((n) => n.region === region).map((n) => n.id));
  const theirs = (el: Element) => !mine.has(el.getAttribute('data-from') ?? '') || !mine.has(el.getAttribute('data-to') ?? '');
  return [
    ...[...root.querySelectorAll<HTMLElement>('vb-region')].filter((r) => r.dataset.region !== region),
    ...[...root.querySelectorAll<HTMLElement>('.vb-cards > vb-node')].filter((n) => !mine.has(n.dataset.id ?? '')),
    ...[...root.querySelectorAll('.vb-wires [data-from]')].filter(theirs),
  ];
}
