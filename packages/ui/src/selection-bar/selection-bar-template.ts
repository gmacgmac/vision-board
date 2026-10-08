// Selection bar pattern, layer 2 (template): one pure function from the bar's view to its markup.
// Tokens only, no inline styles (the page's CSP refuses them). Architect `.selbar`: the count, then
// the buttons on one line; the first primary button wears the accent fill.
import type { BarView } from './selection-bar-core.ts';
import { esc } from '../markdown/inline.ts';

export function selectionBarTemplate(v: BarView): string {
  const count = v.count ? `<span class="vb-sb-count">${esc(v.count)}</span>` : '';
  return count + v.buttons.map((b) =>
    `<button type="button" class="vb-sb-btn${b.primary ? ' vb-sb-primary' : ''}" data-command="${esc(b.id)}"${b.disabled ? ' disabled' : ''}>${esc(b.label)}</button>`,
  ).join('');
}
