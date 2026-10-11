// A link's label on its line (field report batch 3 ruling 3, linkLabels flag). The layout places
// it (`Route.labelAt`): where it fits, the label is drawn centred there, on a canvas-coloured tag so
// the line does not show through, and no wider than the box the layout kept for it
// (`labelSize`), which works the width out from the length; a label whose text runs wider in the
// page's font is squeezed to fit (`fitLabel`), never let out over a card or another label. Where
// the label does not fit, link-marks.ts draws a marker instead. With the flag off, every label is
// drawn at the middle of its line, as before.
import type { Point, Route } from '../../../../packages/layout/src/index.ts';
import { LABEL_H, labelSize } from '../../../../packages/layout/src/index.ts';
import { esc } from '../../../../packages/ui/src/index.ts';

const NS = 'http://www.w3.org/2000/svg';
/** Room either side of the text inside the tag, px (the layout's LABEL_PAD). */
const PAD = 6;

/** Where `r`'s label goes on its line: on the tag (`at`), or nowhere here (a marker, or no label). */
export const tagAt = (r: Route, on: boolean): Point | null =>
  !r.label ? null : !on ? { x: r.mid.x, y: r.mid.y - 6 } : r.labelAt?.fits ? r.labelAt : null;

/** The tag's box and the text's place, as attributes. With the flag off, the old text alone. */
function parts(label: string, at: Point, on: boolean) {
  const { w } = labelSize(label);
  return {
    rect: on ? { x: at.x - w / 2, y: at.y - LABEL_H / 2, width: w, height: LABEL_H, rx: LABEL_H / 2 } : null,
    text: { x: at.x, y: at.y, 'text-anchor': 'middle', ...(on && { 'dominant-baseline': 'central' }) },
    room: w - 2 * PAD,
  };
}

/** A label as markup, for the layer that repeats the focused card's connectors above the cards. */
export function labelMarkup(label: string, at: Point, on: boolean): string {
  const p = parts(label, at, on);
  const attrs = (o: Record<string, string | number>) => Object.entries(o).map(([k, v]) => ` ${k}="${v}"`).join('');
  const fit = on ? squeezeOf(label, p.room) : '';
  return (p.rect ? `<g class="vb-wire-tag"><rect${attrs(p.rect)}/>` : '')
    + `<text class="vb-wire-label"${attrs(p.text)}${fit}>${esc(label)}</text>${p.rect ? '</g>' : ''}`;
}

/** One label in the connector layer: a `<g>` holding the tag and its text (the text alone, off). */
export function labelElement(label: string, at: Point, on: boolean, el?: SVGGElement): SVGGElement {
  const g = el ?? document.createElementNS(NS, 'g');
  g.setAttribute('class', on ? 'vb-wire-tag' : 'vb-wire-text');
  const p = parts(label, at, on);
  let rect = g.querySelector('rect');
  if (p.rect) {
    rect ??= g.insertBefore(document.createElementNS(NS, 'rect'), g.firstChild);
    for (const [k, v] of Object.entries(p.rect)) rect.setAttribute(k, String(v));
  } else rect?.remove();
  const text = g.querySelector('text') ?? g.appendChild(document.createElementNS(NS, 'text'));
  text.setAttribute('class', 'vb-wire-label');
  for (const k of ['dominant-baseline', 'textLength', 'lengthAdjust']) text.removeAttribute(k);
  for (const [k, v] of Object.entries(p.text)) text.setAttribute(k, String(v));
  text.textContent = label;
  return g;
}

/** The width each label's text takes in the page's font, measured once per text. */
const natural = new Map<string, number>();

const squeezeOf = (label: string, room: number) => {
  const w = natural.get(label);
  return w !== undefined && w > room ? ` textLength="${room}" lengthAdjust="spacingAndGlyphs"` : '';
};

/** Squeeze a drawn tag's text into the tag when the font runs it wider (after it is in the page:
 *  a read, so call it once the batch of writes is done). */
export function fitLabel(g: SVGGElement): void {
  const text = g.querySelector('text');
  const label = text?.textContent ?? '';
  if (!text || g.getAttribute('class') !== 'vb-wire-tag') return;
  let w = natural.get(label);
  if (w === undefined) {
    w = text.getComputedTextLength();
    if (w > 0) natural.set(label, w);
  }
  const room = labelSize(label).w - 2 * PAD;
  if (w > room) {
    text.setAttribute('textLength', String(room));
    text.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
}
