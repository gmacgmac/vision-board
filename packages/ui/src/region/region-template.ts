// Region pattern, layer 2 (template): one pure function from a region to the markup of its
// frame: the top line (title, decided count and holders on the left, in a gap cut from the frame's
// border; on the right the mode row: five layout icons, a divider and the settings cog, README
// pick 1 / mockup 05), the layout popover and the settings menu (both closed until the element
// opens them), and the empty message. Tokens only; no inline styles (the page's CSP forbids them).
// State is applied in place by the element (`VbRegion.update`), so this runs once per view version;
// the holders slot is filled by `holdersTemplate` whenever the holders change.
import type { Mode, Region } from '../../../format/src/index.ts';
import { MODES } from '../../../format/src/index.ts';
import { esc } from '../node/node-template.ts';
import { svgIcon } from '../node/node-icons.ts';
import type { RegionHolder } from './region-core.ts';
import { agentChoiceText, MODE_HINT, MODE_LABEL, RESET_NONE_HINT } from './region-core.ts';
import { COG_ICON, MODE_ICON } from './region-icons.ts';

/** The ids the element ties together with aria-describedby / aria-controls. */
export const regionIds = (id: string) => ({
  heading: `region-${id}`, modes: `region-${id}-modes`, menu: `region-${id}-menu`, hint: `region-${id}-reset-hint`,
});

/** One layout icon: a radio in the row's radiogroup, out of the tab order until `update` makes the
 * checked one the row's single Tab stop. `data-mode` / `data-region` are the page's click wiring. */
const modeButton = (m: Mode, id: string): string =>
  `<button type="button" class="vb-mseg" role="radio" aria-checked="false" tabindex="-1" aria-label="${MODE_LABEL[m]}"`
  + ` data-mode="${m}" data-region="${esc(id)}">${svgIcon(MODE_ICON[m], 24, 'vb-mode-icon')}</button>`;

/** The popover (mockup 05 .mode-pop): one tile per layout with its one-liner, then the foot. The
 * line under the tiles shows the highlighted layout's one-liner in the compact layout only. */
const modePopover = (r: Pick<Region, 'id' | 'mode'>): string => {
  const tiles = MODES.map((m) => `<div class="vb-mtile" data-tile="${m}">${svgIcon(MODE_ICON[m], 24, 'vb-mtile-icon')}`
    + `<span class="vb-mtile-name">${MODE_LABEL[m]}</span><small>${MODE_HINT[m]}</small></div>`).join('');
  return `<div class="vb-mode-pop" id="${regionIds(r.id).modes}" role="tooltip"><div class="vb-mode-tiles">${tiles}</div>`
    + '<p class="vb-mode-line"></p>'
    + `<div class="vb-mode-foot"><span>${agentChoiceText(r.mode)}</span>`
    + '<span><kbd>←</kbd> <kbd>→</kbd> move · <kbd>Enter</kbd> apply · <kbd>Esc</kbd> close</span></div></div>';
};

/** The settings menu: today only "Reset places", disabled with a hint until a card was moved. */
const settingsMenu = (r: Pick<Region, 'id' | 'title'>): string => {
  const ids = regionIds(r.id);
  return `<div class="vb-region-menu" id="${ids.menu}" role="menu" aria-label="Settings for ${esc(r.title)}">`
    + `<button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" data-reset="${esc(r.id)}" aria-label="Reset places"`
    + ` aria-disabled="true" aria-describedby="${ids.hint}">Reset places`
    + `<span class="vb-menu-hint" id="${ids.hint}">${RESET_NONE_HINT}</span></button></div>`;
};

export function regionTemplate(r: Pick<Region, 'id' | 'title' | 'mode'>): string {
  const ids = regionIds(r.id);
  const title = esc(r.title);
  const row = `<div class="vb-mode-row" role="radiogroup" aria-label="Layout for ${title}">`
    + MODES.map((m) => modeButton(m, r.id)).join('')
    + '<span class="vb-mode-div" aria-hidden="true"></span>'
    + `<button type="button" class="vb-mseg vb-cog" tabindex="-1" aria-label="Settings for ${title}" aria-haspopup="menu"`
    + ` aria-expanded="false" aria-controls="${ids.menu}">${svgIcon(COG_ICON, 24, 'vb-mode-icon')}</button></div>`;
  return `<header class="vb-region-head"><div class="vb-region-label"><h2 id="${ids.heading}">${title}</h2>`
    + `<span class="vb-region-count"></span><span class="vb-region-holders"></span></div>`
    + `<div class="vb-region-tools">${row}${modePopover(r)}${settingsMenu(r)}</div>`
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
