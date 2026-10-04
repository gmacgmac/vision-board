// Region pattern, layer 2 (template): one pure function from a region to the markup of its
// frame: the top line (title and decided count on the left; layout-mode buttons and "Reset
// places" on the right, each in a gap cut from the frame's border) and the empty message. Tokens only; no inline styles (the page's CSP forbids them). State is applied in
// place by the element (`VbRegion.update`), so this runs once per view version.
import type { Region } from '../../../format/src/index.ts';
import { MODES } from '../../../format/src/index.ts';
import { esc } from '../node/node-template.ts';
import { MODE_LABEL } from './region-core.ts';

export function regionTemplate(r: Pick<Region, 'id' | 'title'>): string {
  const modes = MODES.map((m) =>
    `<button type="button" class="vb-mode" data-mode="${m}" data-region="${r.id}" aria-pressed="false">${MODE_LABEL[m]}</button>`,
  ).join('');
  return `<header class="vb-region-head"><div class="vb-region-label"><h2 id="region-${r.id}">${esc(r.title)}</h2>`
    + `<span class="vb-region-count"></span></div>`
    + `<div class="vb-region-tools"><div class="vb-modes" role="group" aria-label="Layout for ${esc(r.title)}">${modes}</div>`
    + `<button type="button" class="vb-btn vb-btn-small" data-reset="${r.id}" hidden>Reset places</button></div>`
    + `</header><p class="vb-region-empty" hidden>Everything here is decided.</p>`;
}
