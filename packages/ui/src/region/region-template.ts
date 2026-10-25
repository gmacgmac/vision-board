// Region pattern, layer 2 (template): one pure function from a region to the markup of its
// frame: the top line (title, answered count, the fresh pill and holders, in a gap cut from the frame's border; on
// the right the mode row: six layout icons, a divider and the settings cog, README pick 1 / mockup
// 05, or with the toolRail flag that row in a rail on the frame's left edge instead), the layout popover and the settings menu (both closed until the element
// opens them), and the empty message. Tokens only; no inline styles (the page's CSP forbids them).
// State is applied in place by the element (`VbRegion.update`), so this runs once per view version;
// the holders slot is filled by `holdersTemplate` whenever the holders change.
import type { Mode, Region } from '../../../format/src/index.ts';
import { MODES } from '../../../format/src/index.ts';
import { esc } from '../node/node-template.ts';
import { renderMarkdown } from '../markdown/render.ts';
import { svgIcon, ACTION_ICON } from '../node/node-icons.ts';
import type { RegionHolder } from './region-core.ts';
import type { ReplyEntry } from '../node/node-core.ts';
import { agentChoiceText, MODE_HINT, MODE_LABEL, PUT_BACK_NONE_HINT, RESET_NONE_HINT, WIDTHS_LABEL } from './region-core.ts';
import { COG_ICON, EYE_ICON, MODE_ICON, RETIRED_ICON, WIDTHS_ICON } from './region-icons.ts';

/** The ids the element ties together with aria-describedby / aria-controls. */
export const regionIds = (id: string) => ({
  heading: `region-${id}`, modes: `region-${id}-modes`, menu: `region-${id}-menu`, hint: `region-${id}-reset-hint`,
  back: `region-${id}-back-hint`, preview: `region-${id}-note-preview`, previewText: `region-${id}-note-preview-text`,
  noteText: `region-${id}-note-text`,
});

/** The grip at the start of the label (3_FE_04 ruling 5), the container's keyboard handle: Alt+arrows
 * move it. Its dots are drawn by region.css; the page wires drag and Alt+arrows to it. */
const grip = (title: string): string =>
  `<button type="button" class="vb-region-grip" aria-label="Move container ${title}"`
  + ' aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown" title="Move container · Alt+arrows"></button>';

/** Comment, in the mode row beside the cog (ruling 3): opens the container's note bubble. The
 * page's delegated listener reads `data-region-comment`. Its badge "1" (step 4G ruling 1) waits
 * empty of state until `update` sets `data-badge` on the frame; the name says the state. */
const commentButton = (id: string, title: string): string =>
  `<button type="button" class="vb-mseg vb-region-comment" tabindex="-1" aria-label="Comment on container ${title}"`
  + ` title="Comment · C" aria-haspopup="dialog" data-region-comment="${esc(id)}">`
  + `${svgIcon(ACTION_ICON.comment!, 20, 'vb-mode-icon')}<span class="vb-region-badge" aria-hidden="true">1</span></button>`;

/** A note button of the preview or the note block; `data-note-act` is the element's wiring
 * (a `vb-region-note` event), never the page's. */
const noteButton = (act: string, inner: string, label?: string): string =>
  `<button type="button" class="vb-note-btn" data-note-act="${act}"${label ? ` aria-label="${label}"` : ''}>${inner}</button>`;

/** The preview popover under Comment (step 4G ruling 2): the note's first 3 lines, its state,
 * Edit and Show in container. A non-modal dialog with real buttons (WCAG 1.4.13: hoverable,
 * persistent, Esc dismisses), shown while `data-preview` is on the frame. */
const notePreview = (id: string, title: string): string => {
  const ids = regionIds(id);
  return `<div class="vb-note-pop" id="${ids.preview}" role="dialog" aria-label="Note on container ${title}">`
    + `<p class="vb-note-pop-text" id="${ids.previewText}"></p><p class="vb-note-state"></p><div class="vb-note-acts">`
    + noteButton('edit', 'Edit')
    + noteButton('show', `${svgIcon(EYE_ICON, 20, 'vb-note-eye')}<span class="vb-note-show-label">Show in container</span>`)
    + '</div></div>';
};

/** The note block under the title line, above the cards (step 4G ruling 3, mockup 09 B): shown
 * while the frame's `noteShown` is set. Its state, Edit and Remove (unsent) or why it is
 * read-only (sent), the text in 3 lines, then "Show all" when it is longer. */
const noteBlock = (id: string, title: string): string => {
  const ids = regionIds(id);
  return `<section class="vb-region-note-block" role="group" aria-label="Note on container ${title}" hidden>`
    + '<div class="vb-nblock-top"><span class="vb-nblock-who">Your note</span><span class="vb-note-state"></span>'
    + `<span class="vb-nblock-acts">${noteButton('edit', 'Edit', `Edit note on container ${title}`)}`
    + `${noteButton('remove', 'Remove', `Remove note on container ${title}`)}<span class="vb-nblock-ro"></span></span></div>`
    + `<p class="vb-nblock-text" id="${ids.noteText}" tabindex="0"></p><div class="vb-nblock-replies"></div>`
    + `<button type="button" class="vb-nblock-more" aria-expanded="false" aria-controls="${ids.noteText}" hidden>Show all</button>`
    + '</section>';
};

/** The agent's replies under the note block's text (FE_03 ruling 3): "Agent reply · label" over
 * the words as Markdown, each cut at three lines like the note until the block's "Show all". Each
 * is a tab stop: a click, Enter or Space opens the exchange (popovers-larger-thread ruling 2). */
export const nblockRepliesMarkup = (replies: readonly ReplyEntry[]): string => replies.map((r) =>
  `<div class="vb-nblock-reply" data-reply="${r.seq}" tabindex="0"><span class="vb-nblock-who">${esc(r.who)}</span>`
  + `<div class="vb-nblock-reply-text">${renderMarkdown(r.text)}</div></div>`).join('');

/** One layout icon: a radio in the row's radiogroup, out of the tab order until `update` makes the
 * checked one the row's single Tab stop. `data-mode` / `data-region` are the page's click wiring. */
const modeButton = (m: Mode, id: string): string =>
  `<button type="button" class="vb-mseg" role="radio" aria-checked="false" tabindex="-1" aria-label="${MODE_LABEL[m]}"`
  + ` data-mode="${m}" data-region="${esc(id)}">${svgIcon(MODE_ICON[m], 24, 'vb-mode-icon')}</button>`;

/** Match card widths (widthsControl flag, field report batch 3 ruling 5): a switch in the row, after
 * the layouts' divider, on while every card in a column takes its widest card's width. `update`
 * sets `aria-checked`, the title and `data-widths`, the value a press sends (the page's click
 * wiring, with `data-region`); both icons are drawn and region.css shows the one in force. */
const widthsSwitch = (id: string): string =>
  `<button type="button" class="vb-mseg vb-widths" role="switch" aria-checked="false" tabindex="-1" aria-label="${WIDTHS_LABEL}"`
  + ` data-region="${esc(id)}">${svgIcon(WIDTHS_ICON.match, 24, 'vb-mode-icon vb-widths-match')}`
  + `${svgIcon(WIDTHS_ICON.own, 24, 'vb-mode-icon vb-widths-own')}</button>`;

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

/** The settings menu: "Reset places" (the cards' pins) and "Put container back" (the container's
 * own place, 3_FE_04 ruling 7), each disabled with its hint until `update` enables it; with `remove`
 * (personRemove flag, N24) then "Remove container", which the page confirms first. */
const settingsMenu = (r: Pick<Region, 'id' | 'title'>, remove: boolean): string => {
  const ids = regionIds(r.id);
  const item = (data: string, label: string, hint: string, hintId: string) =>
    `<button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" ${data}="${esc(r.id)}" aria-label="${label}"`
    + ` aria-disabled="true" aria-describedby="${hintId}">${label}<span class="vb-menu-hint" id="${hintId}">${hint}</span></button>`;
  return `<div class="vb-region-menu" id="${ids.menu}" role="menu" aria-label="Settings for ${esc(r.title)}">`
    + item('data-reset', 'Reset places', RESET_NONE_HINT, ids.hint)
    + item('data-put-back', 'Put container back', PUT_BACK_NONE_HINT, ids.back)
    + (remove ? `<button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" data-remove-region="${esc(r.id)}">Remove container</button>` : '')
    + '</div>';
};

/** How a frame is built. `fixed`: its layout is set by the board, so it has no layout icons and
 * no popover, only the cog (the built-in Later, 3_FE_03 ruling 5); it takes no note either, so no
 * Comment, note preview or note block, but keeps its grip (Later can be placed). `empty`: the
 * message it shows when the layout drew none of its cards, in place of `EMPTY_DECIDED`. `widths`:
 * the Match card widths switch (widthsControl flag); a fixed frame never has it. `remove`: Remove
 * container in the settings menu (personRemove flag, N24); a fixed frame never has it. `rail`: the tools
 * group (row, popover, note preview, menu) sits in a rail on the frame's left edge, after the header,
 * instead of on the top line (toolRail flag, container tool rail Design 1); the top line then holds
 * the label alone. A fixed frame's rail holds only the cog. */
export interface RegionFrameOptions { fixed?: boolean; empty?: string; widths?: boolean; remove?: boolean; rail?: boolean }

/** The empty message of an ordinary frame: every card it has is answered and hidden. */
export const EMPTY_DECIDED = 'Everything here is answered.';

/** "3 retired" after the count (retiredMarker flag), hidden until `update` says how many and which
 * version a press opens (`data-version`, the page's click wiring). Its icon shows, and its word goes,
 * when the line has no room for the words (round 2 ruling 1, region-narrow.css); the full words are
 * its name and tooltip. */
const RETIRED_MARKER = `<button type="button" class="vb-region-retired" hidden>${svgIcon(RETIRED_ICON, 24, 'vb-retired-icon')}`
  + '<span class="vb-retired-n"></span><span class="vb-retired-word"> retired</span></button>';

/** The answered count (D-045): "1/1" on the line (round 2 ruling 1), and "1 of 1 answered" as its
 * tooltip and for screen readers (a visually hidden copy; the short form is hidden from them). */
const COUNT = '<span class="vb-region-count" hidden><span class="vb-region-count-n" aria-hidden="true"></span>'
  + '<span class="vb-region-count-words"></span></span>';

/** What a drag moves the container by (open list and container title FE_02): the grip, the title and
 * the count, one box with one hover tint (region.css). The line's bar sets it in the middle of the
 * frame, sliding left when the line is short. */
const handle = (title: string, heading: string): string =>
  `<span class="vb-region-handle">${grip(title)}<h2 id="${heading}">${title}</h2>${COUNT}</span>`;

/** "3 new · 1 updated" after the count (freshCards flag, region-fresh.ts), hidden until `update` says
 * how many; its full words are its tooltip and what screen readers read. Its slot is a wrapping row
 * one line high, like the holders', so with no room the pill leaves the line whole (region-fresh.css). */
const FRESH = '<span class="vb-region-fresh-slot"><span class="vb-region-fresh" hidden><span class="vb-region-fresh-n" aria-hidden="true"></span>'
  + '<span class="vb-region-fresh-words"></span></span></span>';

export function regionTemplate(r: Pick<Region, 'id' | 'title' | 'mode'>, opts: RegionFrameOptions = {}): string {
  const ids = regionIds(r.id);
  const title = esc(r.title);
  const notes = !opts.fixed;
  const modes = opts.fixed ? '' : MODES.map((m) => modeButton(m, r.id)).join('') + '<span class="vb-mode-div" aria-hidden="true"></span>';
  const row = `<div class="vb-mode-row"${opts.fixed ? '' : ` role="radiogroup" aria-label="Layout for ${title}"`}>`
    + modes + (opts.widths && !opts.fixed ? widthsSwitch(r.id) : '') + (notes ? commentButton(r.id, title) : '')
    + `<button type="button" class="vb-mseg vb-cog" tabindex="-1" aria-label="Settings for ${title}" aria-haspopup="menu"`
    + ` aria-expanded="false" aria-controls="${ids.menu}">${svgIcon(COG_ICON, 24, 'vb-mode-icon')}</button></div>`;
  const tools = `<div class="vb-region-tools">${row}${opts.fixed ? '' : modePopover(r)}${notes ? notePreview(r.id, title) : ''}`
    + `${settingsMenu(r, opts.remove === true && !opts.fixed)}</div>`;
  return `<header class="vb-region-head"><div class="vb-region-bar"><div class="vb-region-label">${handle(title, ids.heading)}`
    + `${FRESH}${RETIRED_MARKER}<span class="vb-region-holders"></span><span class="vb-tip vb-title-tip" aria-hidden="true">${title}</span></div>`
    + `${opts.rail ? '' : tools}</div></header>${opts.rail ? `<div class="vb-region-rail">${tools}</div>` : ''}`
    + `${notes ? noteBlock(r.id, title) : ''}<p class="vb-region-empty" hidden>${esc(opts.empty ?? EMPTY_DECIDED)}</p>`;
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
