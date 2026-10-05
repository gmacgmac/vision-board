// Region pattern, layer 2 (template): one pure function from a region to the markup of its
// frame: the top line (title, decided count and holders on the left; layout-mode buttons and
// "Reset places" on the right, each in a gap cut from the frame's border) and the empty message.
// Tokens only; no inline styles (the page's CSP forbids them). State is applied in place by the
// element (`VbRegion.update`), so this runs once per view version; the holders slot is filled by
// `holdersTemplate` whenever the holders change.
import type { Region } from '../../../format/src/index.ts';
import { MODES } from '../../../format/src/index.ts';
import { esc } from '../node/node-template.ts';
import type { RegionHolder } from './region-core.ts';
import { MODE_LABEL } from './region-core.ts';

export function regionTemplate(r: Pick<Region, 'id' | 'title'>): string {
  const modes = MODES.map((m) =>
    `<button type="button" class="vb-mode" data-mode="${m}" data-region="${r.id}" aria-pressed="false">${MODE_LABEL[m]}</button>`,
  ).join('');
  return `<header class="vb-region-head"><div class="vb-region-label"><h2 id="region-${r.id}">${esc(r.title)}</h2>`
    + `<span class="vb-region-count"></span><span class="vb-region-holders"></span></div>`
    + `<div class="vb-region-tools"><div class="vb-modes" role="group" aria-label="Layout for ${esc(r.title)}">${modes}</div>`
    + `<button type="button" class="vb-btn vb-btn-small" data-reset="${r.id}" hidden>Reset places</button></div>`
    + `</header><p class="vb-region-empty" hidden>Everything here is decided.</p>`;
}

/**
 * The holders after the count (agentAccess flag): "· Pricing chat" in the count's muted style.
 * The creator is plain text; every other holder is a button that shows "Remove access" on hover
 * or keyboard focus and starts the revoke (the page asks for confirmation first, rule 8).
 */
export function holdersTemplate(holders: readonly RegionHolder[]): string {
  return holders.map((h) => {
    const sep = '<span class="vb-holder-sep" aria-hidden="true">·</span>';
    const name = `<span class="vb-holder-name">${esc(h.label)}</span>`;
    if (!h.removable) return `<span class="vb-holder" title="Created this container">${sep}${name}</span>`;
    return `<button type="button" class="vb-holder" data-revoke="${esc(h.agent)}" aria-label="${esc(h.label)}: remove access">`
      + `${sep}${name}<span class="vb-holder-remove" aria-hidden="true">Remove access</span></button>`;
  }).join('');
}
