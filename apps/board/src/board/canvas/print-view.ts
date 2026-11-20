// The print view (D-107; export-import-print PLAN decisions 8-9; Save as PDF, nclite ADR-0381): what the board sets on its
// root before the host saves it as a PDF, and takes off after. A print stylesheet over the live page (styles/print.css)
// reads it: no header, strips, panels or menus; the scope, the whole board or one container, at its own size (no fit to
// paper: the host makes one page exactly `size`), on the board's own background, so the host reads the page's colour
// from the root; the containers' borders as chosen; colours kept. Nothing is drawn again: the cards, frames and links
// are the ones on screen. A container's view hides every other frame, card and link (`data-vb-print-out`). The world's
// transform, the zoom level's marks on the stage (`data-zoom`, `data-marks`), the zoom's own properties on the layers
// (`--vb-zoom`, the marks' growth) are the view's own while it lasts, so a board saved zoomed out still saves its cards
// whole, at 100%. Everything it sets is on the board's root or inside it: the page and the look's colours are the
// host's, asked through `savePdf(ask)` (host.ts `PdfAsk`; board-files.ts). Browser only, no sentence.
import type { View } from '#format';
import type { BoardLayout, Box } from '#layout';

/** Room round what is saved, so a card's marks that hang over its edge (D-099) and a frame's title are not cut. */
export const PRINT_PAD = 24;

/** What is saved, in board coordinates: `box` padded by `pad`, at its own size (the page is exactly `w` × `h`). */
export interface PrintFit { x: number; y: number; w: number; h: number }

/** The extent of `box` on the page: padded by `pad`, rounded out to whole px. */
export function printFit(box: Box, pad = PRINT_PAD): PrintFit {
  return { x: box.x - pad, y: box.y - pad, w: Math.ceil(box.w + 2 * pad), h: Math.ceil(box.h + 2 * pad) };
}

/** What to print: one container (`region`) or, without it, the whole board; `border`, the containers' borders; `theme`,
 *  light or dark in the PDF (point 615), whatever the screen shows: the host's look (board-files.ts), not the print view's. */
export interface PrintScope { region?: string | undefined; border: boolean; theme: 'light' | 'dark' }

const OUT = 'data-vb-print-out';
/** The stage's zoom level marks (viewport.ts): the print shows the cards as at 100%, then shrinks them with the world. */
const LEVEL = ['data-zoom', 'data-marks'] as const;
const VARS = ['--vb-print-w', '--vb-print-h', '--vb-print-transform'] as const;
/** The zoom's own properties (viewport.ts, on the frames' and the cards' layers): as at 100% while the print lasts. */
const ZOOM = ['--vb-zoom', '--vb-mark-grow'] as const;

/** A print view set: the page's size, in CSS px (`PdfAsk` `size`), and what undoes the view. */
export interface PrintSet { size: { width: number; height: number }; undo(): void }

/** Set the print view for `scope` on `root`, over the board as `layout` and `view` draw it; null when `scope` names a
 *  container the layout doesn't hold. */
export function preparePrint(root: HTMLElement, layout: BoardLayout, view: View, scope: Pick<PrintScope, 'region' | 'border'>): PrintSet | null {
  const box = scope.region === undefined ? layout.bounds : layout.regions.find((r) => r.id === scope.region)?.box;
  if (!box) return null;
  const fit = printFit(box);
  const stage = root.querySelector<HTMLElement>('.vb-stage');
  const level = LEVEL.map((a) => [a, stage?.getAttribute(a) ?? null] as const);
  for (const [a] of level) stage?.removeAttribute(a);
  const layers = [...root.querySelectorAll<HTMLElement>('.vb-regions, .vb-cards')];
  const zoom = layers.map((el) => ZOOM.map((v) => el.style.getPropertyValue(v)));
  for (const el of layers) for (const v of ZOOM) el.style.setProperty(v, '1');
  Object.assign(root.dataset, { vbPrint: scope.region ?? 'board', vbPrintBorder: scope.border ? 'on' : 'off' });
  root.style.setProperty('--vb-print-w', `${fit.w}px`);
  root.style.setProperty('--vb-print-h', `${fit.h}px`);
  root.style.setProperty('--vb-print-transform', `translate(${-fit.x}px, ${-fit.y}px)`);
  const out = scope.region === undefined ? [] : outside(root, view, scope.region);
  for (const el of out) el.setAttribute(OUT, '');
  const undo = () => {
    for (const el of out) el.removeAttribute(OUT);
    for (const v of VARS) root.style.removeProperty(v);
    delete root.dataset.vbPrint;
    delete root.dataset.vbPrintBorder;
    for (const [a, v] of level) if (v !== null) stage?.setAttribute(a, v);
    layers.forEach((el, i) => ZOOM.forEach((v, j) => (zoom[i]![j] ? el.style.setProperty(v, zoom[i]![j]!) : el.style.removeProperty(v))));
  };
  return { size: { width: fit.w, height: fit.h }, undo };
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
