// Selection bar pattern, layer 2 (template): one pure function from the bar's view to its markup.
// Tokens only, no inline styles (the page's CSP refuses them). Architect `.selbar`: the count, then
// the buttons on one line; the first primary button wears the accent fill. With the pill
// (stage5-follow-ups FE_02) the count is a button with a chevron; open or closed draws the same
// markup, the element sets `aria-expanded` and `data-open`, so the pill keeps focus as it opens.
import type { BarView } from './selection-bar-core.ts';
import { esc } from '../markdown/inline.ts';

export function selectionBarTemplate(v: BarView): string {
  const count = !v.count ? ''
    : v.pill ? `<button type="button" class="vb-sb-pill" aria-expanded="false">${esc(v.count)}<span class="vb-sb-chevron" aria-hidden="true"></span></button>`
    : `<span class="vb-sb-count">${esc(v.count)}</span>`;
  return count + v.buttons.map((b) =>
    `<button type="button" class="vb-sb-btn${b.primary ? ' vb-sb-primary' : ''}" data-command="${esc(b.id)}"${b.disabled ? ' disabled' : ''}>${esc(b.label)}</button>`,
  ).join('');
}
