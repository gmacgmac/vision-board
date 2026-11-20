// Region pattern, layer 2 (template): one pure function from a region to the markup of its
// frame: the top line (title, answered count, the fresh pill and the holders chip, in a gap cut from the frame's border; on
// the right the mode row: the one layout button, a divider and the settings cog (PLAN decision 20; README pick 1 / mockup
// 05), or with the toolRail flag that row in a rail on the frame's left edge instead), the layout popover (the button's
// menu) and the settings menu (both closed until the element opens them), and the empty message. Tokens only; no inline styles (the page's CSP forbids them).
// State is applied in place by the element (`VbRegion.update`), so this runs once per view version;
// the holders slot is filled by `holdersTemplate` whenever the holders change.
import type { Mode, Region } from '#format';
import { ACT_DIRECTIONS as DIRECTIONS, MODES } from '#format';
import { esc } from '../node/node-template.ts';
import type { MarkdownOptions } from '../markdown/render.ts';
import { renderMarkdown } from '../markdown/render.ts';
import { svgIcon, ACTION_ICON } from '../node/node-icons.ts';
import { icon } from '../icons/icon.ts';
import type { RegionHolder } from './region-core.ts';
import type { ReplyEntry } from '../node/node-core.ts';
import { agentChoiceText, MODE_HINT, MODE_LABEL, PUT_BACK_NONE_HINT, RESET_NONE_HINT, WIDTHS_LABEL } from './region-core.ts';
import { COG_ICON, EYE_ICON, MODE_ICON, RETIRED_ICON, WIDTHS_ICON } from './region-icons.ts';
import * as regionWords from '../words/region.ts';
import * as uiCommonWords from '../words/ui-common.ts';

/** The ids the element ties together with aria-describedby / aria-controls. `prefix` is the mount's
 * (RegionFrameOptions.idPrefix), so two boards on one page repeat none. */
export const regionIds = (id: string, prefix = '') => ({
  heading: `${prefix}region-${id}`, modes: `${prefix}region-${id}-modes`, menu: `${prefix}region-${id}-menu`, hint: `${prefix}region-${id}-reset-hint`,
  back: `${prefix}region-${id}-back-hint`, preview: `${prefix}region-${id}-note-preview`, previewText: `${prefix}region-${id}-note-preview-text`,
  noteText: `${prefix}region-${id}-note-text`, holders: `${prefix}region-${id}-holders`,
});

/** The ids of the frame `host` (a `vb-region`): its container and the prefix it was drawn with. */
export const regionIdsOf = (host: HTMLElement) => regionIds(host.dataset.region ?? '', host.dataset.idPrefix);

/** The grip at the start of the label (3_FE_04 ruling 5), the container's keyboard handle: Alt+arrows
 * move it. Its dots are drawn by region.css; the page wires drag and Alt+arrows to it. */
const grip = (title: string): string =>
  `<button type="button" class="vb-region-grip" aria-label="${regionWords.moveContainer(title)}"`
  + ' aria-keyshortcuts="Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown" title="' + regionWords.moveContainerAltArrows + '"></button>';

/** Comment, in the mode row beside the cog (ruling 3): opens the container's note bubble. The
 * page's delegated listener reads `data-region-comment`. Its badge "1" (step 4G ruling 1) waits
 * empty of state until `update` sets `data-badge` on the frame; the name says the state. */
const commentButton = (id: string, title: string): string =>
  `<button type="button" class="vb-mseg vb-region-comment" tabindex="-1" aria-label="${regionWords.commentOnContainer(title)}"`
  + ` title="Comment · C" aria-haspopup="dialog" data-region-comment="${esc(id)}">`
  + `${svgIcon(ACTION_ICON.comment!, 20, 'vb-mode-icon')}<span class="vb-region-badge" aria-hidden="true">1</span></button>`;

/** A note button of the preview or the note block; `data-note-act` is the element's wiring
 * (a `vb-region-note` event), never the page's. */
const noteButton = (act: string, inner: string, label?: string): string =>
  `<button type="button" class="vb-note-btn" data-note-act="${act}"${label ? ` aria-label="${label}"` : ''}>${inner}</button>`;

/** The preview popover under Comment (step 4G ruling 2): the note's first 3 lines, its state,
 * Edit and Show in container. A non-modal dialog with real buttons (WCAG 1.4.13: hoverable,
 * persistent, Esc dismisses), shown while `data-preview` is on the frame. */
const notePreview = (id: string, title: string, prefix?: string): string => {
  const ids = regionIds(id, prefix);
  return `<div class="vb-note-pop" id="${ids.preview}" role="dialog" aria-label="${regionWords.noteOnContainer(title)}">`
    + `<p class="vb-note-pop-text" id="${ids.previewText}"></p><p class="vb-note-state"></p><div class="vb-note-acts">`
    + noteButton('edit', uiCommonWords.edit)
    + noteButton('show', `${svgIcon(EYE_ICON, 20, 'vb-note-eye')}<span class="vb-note-show-label">${uiCommonWords.showInContainer}</span>`)
    + '</div></div>';
};

/** The note block under the title line, above the cards (step 4G ruling 3, mockup 09 B): shown
 * while the frame's `noteShown` is set. Its state, Edit and Remove (unsent) or why it is
 * read-only (sent), the text in 3 lines, then "Show all" when it is longer. */
const noteBlock = (id: string, title: string, prefix?: string): string => {
  const ids = regionIds(id, prefix);
  return `<section class="vb-region-note-block" role="group" aria-label="${regionWords.noteOnContainer(title)}" hidden>`
    + '<div class="vb-nblock-top"><span class="vb-nblock-who">' + uiCommonWords.yourNote + '</span><span class="vb-note-state"></span>'
    + `<span class="vb-nblock-acts">${noteButton('edit', uiCommonWords.edit, regionWords.editNoteOnContainer(title))}`
    + `${noteButton('remove', uiCommonWords.remove, regionWords.removeNoteOnContainer(title))}<span class="vb-nblock-ro"></span></span></div>`
    + `<p class="vb-nblock-text" id="${ids.noteText}" tabindex="0"></p><div class="vb-nblock-replies"></div>`
    + `<button type="button" class="vb-nblock-more" aria-expanded="false" aria-controls="${ids.noteText}" hidden>${uiCommonWords.showAll}</button>`
    + '</section>';
};

/** The agent's replies under the note block's text (FE_03 ruling 3): "Agent reply · label" over
 * the words as Markdown, each cut at three lines like the note until the block's "Show all". Each
 * is a tab stop: a click, Enter or Space opens the exchange (popovers-larger-thread ruling 2). A reply the person has
 * not looked at carries `data-unseen` (the bright edge; N47: until a click inside its container). */
export const nblockRepliesMarkup = (replies: readonly ReplyEntry[], md?: MarkdownOptions): string => replies.map((r) =>
  `<div class="vb-nblock-reply" data-reply="${r.seq}"${r.unseen ? ' data-unseen' : ''} tabindex="0"><span class="vb-nblock-who">${esc(r.who)}</span>`
  + `<div class="vb-nblock-reply-text">${renderMarkdown(r.text, md)}</div></div>`).join('');

/** Match card widths (widthsControl flag, field report batch 3 ruling 5): a switch in the row, after
 * the layouts' divider, on while every card in a column takes its widest card's width. `update`
 * sets `aria-checked`, the title and `data-widths`, the value a press sends (the page's click
 * wiring, with `data-region`); both icons are drawn and region.css shows the one in force. */
const widthsSwitch = (id: string): string =>
  `<button type="button" class="vb-mseg vb-widths" role="switch" aria-checked="false" tabindex="-1" aria-label="${WIDTHS_LABEL}"`
  + ` data-region="${esc(id)}">${svgIcon(WIDTHS_ICON.match, 24, 'vb-mode-icon vb-widths-match')}`
  + `${svgIcon(WIDTHS_ICON.own, 24, 'vb-mode-icon vb-widths-own')}</button>`;

/** The one layout button (PLAN decision 20): the active layout's icon, a menu button for the popover below it. `update` sets
 * its icon, its name ("Layout: Flow, down") and `aria-expanded` follows the popover; `data-layout` marks it for the element. */
const layoutButton = (id: string, mode: Mode, prefix?: string): string =>
  `<button type="button" class="vb-mseg vb-layout-btn" tabindex="-1" aria-label="${regionWords.layoutChosen(MODE_LABEL[mode])}" aria-haspopup="menu"`
  + ` aria-expanded="false" aria-controls="${regionIds(id, prefix).modes}" data-layout="${esc(id)}">${svgIcon(MODE_ICON[mode], 24, 'vb-mode-icon vb-layout-icon')}</button>`;

/** A flow's direction in the popover (D-100 5): Across, Down and Auto, one choice marked by `update`; a press sends the
 * `direction` act for this container (`data-dir`, the page's click wiring). Shown while the layout is a flow, or while the
 * container has a timeline (D-105, `RegionState.timeline`), which runs the same way. */
const directionRow = (id: string): string =>
  `<div class="vb-dir-row" role="group" aria-label="${regionWords.directionGroup}">${DIRECTIONS.map((d) =>
    `<button type="button" class="vb-dir" role="menuitemradio" aria-checked="false" tabindex="-1" data-dir="${d}" data-region="${esc(id)}">`
    + `<span class="vb-dir-name">${regionWords.directionName(d)}</span><small>${regionWords.directionHint(d)}</small></button>`).join('')}</div>`;

/** The layout button's menu (mockup 05 .mode-pop): one tile per layout with its one-liner, a flow's directions, then the foot.
 * A tile is a menu radio, out of the tab order until the arrow keys reach it; a click sets the layout through the page's click
 * wiring (`data-tile` is its mode, `data-region` the frame). The line under the tiles shows the highlighted layout's one-liner
 * in the compact layout only. */
const modePopover = (r: Pick<Region, 'id' | 'mode' | 'title'>, prefix?: string): string => {
  const tiles = MODES.map((m) => `<button type="button" class="vb-mtile" role="menuitemradio" aria-checked="false" tabindex="-1" data-tile="${m}" data-region="${esc(r.id)}">`
    + `${svgIcon(MODE_ICON[m], 24, 'vb-mtile-icon')}<span class="vb-mtile-name">${MODE_LABEL[m]}</span><small>${MODE_HINT[m]}</small></button>`).join('');
  return `<div class="vb-mode-pop" id="${regionIds(r.id, prefix).modes}" role="menu" aria-label="${regionWords.layoutMenuFor(esc(r.title))}"><div class="vb-mode-tiles">${tiles}</div>`
    + directionRow(r.id)
    + '<p class="vb-mode-line"></p>'
    + `<div class="vb-mode-foot"><span>${agentChoiceText(r.mode)}</span>`
    + '<span><kbd>←</kbd> <kbd>→</kbd> ' + regionWords.move + ' <kbd>' + regionWords.enter + '</kbd> ' + regionWords.apply + ' <kbd>' + regionWords.esc + '</kbd> ' + regionWords.close + '</span></div></div>';
};

/** The settings menu: "Reset places" (the cards' pins) and "Put container back" (the container's
 * own place, 3_FE_04 ruling 7), each disabled with its hint until `update` enables it; with `files` (D-107)
 * "Save container as PDF…" and "Export container…", each when its host hook is given, which open the board's files dialog (never
 * disabled: neither changes the board); with `remove` (personRemove flag, N24) then "Remove container", which the page
 * confirms first. */
const settingsMenu = (r: Pick<Region, 'id' | 'title'>, remove: boolean, files: RegionFrameOptions['files'], prefix?: string): string => {
  const ids = regionIds(r.id, prefix);
  const item = (data: string, label: string, hint: string, hintId: string) =>
    `<button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" ${data}="${esc(r.id)}" aria-label="${label}"`
    + ` aria-disabled="true" aria-describedby="${hintId}">${label}<span class="vb-menu-hint" id="${hintId}">${hint}</span></button>`;
  const opens = (data: string, label: string) =>
    `<button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" aria-haspopup="dialog" ${data}="${esc(r.id)}">${label}</button>`;
  return `<div class="vb-region-menu" id="${ids.menu}" role="menu" aria-label="${regionWords.settingsFor(esc(r.title))}">`
    + item('data-reset', regionWords.resetPlaces, RESET_NONE_HINT, ids.hint)
    + item('data-put-back', regionWords.putContainerBack, PUT_BACK_NONE_HINT, ids.back)
    + (files?.print ? opens('data-print-region', regionWords.printContainer) : '')
    + (files?.export ? opens('data-export-region', regionWords.exportContainer) : '')
    + (remove ? `<button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" data-remove-region="${esc(r.id)}">${regionWords.removeContainer}</button>` : '')
    + '</div>';
};

/** How a frame is built. `fixed`: its layout is set by the board, so it has no layout button and
 * no popover, only the cog (the built-in Later, 3_FE_03 ruling 5); it takes no note either, so no
 * Comment, note preview or note block, but keeps its grip (Later can be placed). `empty`: the
 * message it shows when the layout drew none of its cards, in place of `EMPTY_DECIDED`. `widths`:
 * the Match card widths switch (widthsControl flag); a fixed frame never has it. `remove`: Remove
 * container in the settings menu (personRemove flag, N24); a fixed frame never has it. `rail`: the tools
 * group (row, popover, note preview, menu) sits in a rail on the frame's left edge, after the header,
 * instead of on the top line (toolRail flag, container tool rail Design 1); the top line then holds
 * the label alone. A fixed frame's rail holds only the cog. `railHover`: with `rail`, the frame carries
 * data-rail-hover and its rail icons show only while it is in use (railOnHover flag; region-rail.css). `idPrefix`: put before every id the frame
 * sets, so two boards on one page repeat none (the board's `mount`); empty for the first and the gallery. `files`: Save container as PDF…
 * and Export container… in the settings menu (each when the host gives its hook, D-107); a fixed frame never has them. */
export interface RegionFrameOptions {
  fixed?: boolean; empty?: string; widths?: boolean; remove?: boolean; rail?: boolean; railHover?: boolean; idPrefix?: string; markdown?: MarkdownOptions;
  files?: { print?: boolean; export?: boolean };
}

/** The empty message of an ordinary frame: every card it has is answered and hidden. */
export const EMPTY_DECIDED = regionWords.everythingHereIsAnswered;

/** "3 retired" after the count (retiredMarker flag), hidden until `update` says how many and which
 * version a press opens (`data-version`, the page's click wiring). Its icon shows, and its word goes,
 * when the line has no room for the words (round 2 ruling 1, region-narrow.css); the full words are
 * its name and tooltip. */
const RETIRED_MARKER = `<button type="button" class="vb-region-retired" hidden>${svgIcon(RETIRED_ICON, 24, 'vb-retired-icon')}`
  + '<span class="vb-retired-n"></span><span class="vb-retired-word"> ' + regionWords.retired2 + '</span></button>';

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
  const ids = regionIds(r.id, opts.idPrefix);
  const title = esc(r.title);
  const notes = !opts.fixed;
  const modes = opts.fixed ? '' : layoutButton(r.id, r.mode, opts.idPrefix) + '<span class="vb-mode-div" aria-hidden="true"></span>';
  const row = '<div class="vb-mode-row">'
    + modes + (opts.widths && !opts.fixed ? widthsSwitch(r.id) : '') + (notes ? commentButton(r.id, title) : '')
    + `<button type="button" class="vb-mseg vb-cog" tabindex="-1" aria-label="${regionWords.settingsFor(title)}" aria-haspopup="menu"`
    + ` aria-expanded="false" aria-controls="${ids.menu}">${svgIcon(COG_ICON, 24, 'vb-mode-icon')}</button></div>`;
  const tools = `<div class="vb-region-tools">${row}${opts.fixed ? '' : modePopover(r, opts.idPrefix)}${notes ? notePreview(r.id, title, opts.idPrefix) : ''}`
    + `${settingsMenu(r, opts.remove === true && !opts.fixed, opts.fixed ? undefined : opts.files, opts.idPrefix)}</div>`;
  return `<header class="vb-region-head"><div class="vb-region-bar"><div class="vb-region-label">${handle(title, ids.heading)}`
    + `${FRESH}${RETIRED_MARKER}<span class="vb-region-holders"></span><span class="vb-tip vb-title-tip" aria-hidden="true">${title}</span></div>`
    + `${opts.rail ? '' : tools}</div></header>${opts.rail ? `<div class="vb-region-rail">${tools}</div>` : ''}`
    + `${notes ? noteBlock(r.id, title, opts.idPrefix) : ''}<p class="vb-region-empty" hidden>${esc(opts.empty ?? EMPTY_DECIDED)}</p>`;
}

/**
 * The holders after the count (agentAccess flag, PLAN decision 7): one chip, a person icon and the count, and the list it
 * opens: each holder's label, "Created this container" on the creator, and Remove on every other (the page asks for
 * confirmation first, rule 8). The list is a non-modal dialog the chip controls (`bindHoldersTip`, region-holders.ts); none
 * with no holders. `id` is the list's, for aria-controls.
 */
export function holdersTemplate(holders: readonly RegionHolder[], id = ''): string {
  if (holders.length === 0) return '';
  const rows = holders.map((h) => `<li class="vb-holder"><span class="vb-holder-name">${esc(h.label)}</span>`
    + (h.removable
      ? `<button type="button" class="vb-holder-remove" data-revoke="${esc(h.agent)}" aria-label="${regionWords.removeAccess(esc(h.label))}">${uiCommonWords.remove}</button>`
      : `<span class="vb-holder-note">${regionWords.createdThisContainer}</span>`) + '</li>').join('');
  return `<button type="button" class="vb-holders-chip" aria-expanded="false" aria-controls="${id}" aria-label="${regionWords.holdersChip(holders.length)}">`
    + `${icon('user', 'vb-holders-icon')}<span class="vb-holders-n" aria-hidden="true">${holders.length}</span></button>`
    + `<div class="vb-holders-pop vb-surface-pop" id="${id}" role="dialog" aria-label="${regionWords.holdersList}"><ul class="vb-holders-list">${rows}</ul></div>`;
}
