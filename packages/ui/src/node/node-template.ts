// Node pattern, layer 2 (template): one pure function from a node to its markup. Tokens only;
// no inline styles (the page's CSP forbids them). State changes are applied in place by the
// element (`VbNode.update`: data-status, aria-pressed, the status word, the note), so this runs
// once per view version. The look is board v3's card (D-024, mockup 01b): content first, number
// and kind as tabs in gaps cut from the top border, kind icon, state word and buttons in a footer.
import type { ActionId, NodeSize, ViewNode } from '#format';
import { NODE_TYPES } from '#format';
import { ACTIONS } from '#actions';
import type { HandoverView, NotesView, ProposalsView, ReplyEntry } from './node-core.ts';
import type { UpdatesView } from './node-updates.ts';
import type { AppCardView } from './node-app.ts';
import { APPS_OFF, appView } from './node-app.ts';
import { panelSize } from '../app-frame/app-frame-core.ts';
import { buttonLabel, FLAG_KEY, flagLabel, isItem, isNoteEntry, offers, SIZE_LETTER } from './node-core.ts';
import { ACTION_ICON, FLAG_ICON, KIND_ICON, SIZE_ICON, svgIcon } from './node-icons.ts';
import { esc } from '../markdown/inline.ts';
import { renderMarkdown } from '../markdown/render.ts';
import { fullTime, noteTime } from './node-time.ts';
import { HISTORY, historyBox, historyButton } from './node-history.ts';
import * as nodeWords from '../words/node.ts';
import * as uiCommonWords from '../words/ui-common.ts';

// One escaper for every text run in packages/ui: the Markdown renderer's, re-exported here.
export { esc } from '../markdown/inline.ts';

/** A review button; its tooltip is the registry's label, Check and Cross for ✓ and ✗ (D-045). */
const button = (a: ActionId, n: ViewNode): string =>
  `<button type="button" class="vb-act" data-act="${a}" aria-label="${esc(buttonLabel(a, n))}"`
  + ` title="${esc(ACTIONS[a].label)}${ACTIONS[a].key ? ` · ${ACTIONS[a].key}` : ''}">`
  + `${svgIcon(ACTION_ICON[a] ?? '', 20, 'vb-act-icon')}</button>`;

/** The tabs on the top border: number (items only), kind, and the moved-by-you marker. An item
 * also gets the note pin on its top-right corner, hidden until it has a note (`update()`). */
function tabs(n: ViewNode): string {
  const num = isItem(n) ? `<span class="vb-node-num" aria-hidden="true">${n.n}</span>` : '';
  const notePin = isItem(n) ? '<button type="button" class="vb-note-pin" aria-haspopup="dialog" aria-expanded="false" hidden></button>' : '';
  return `${num}<span class="vb-node-kind">${NODE_TYPES[n.kind].label}</span>`
    + `<span class="vb-node-pin" aria-hidden="true" title="${nodeWords.movedByYou}">◆</span>${notePin}`;
}

/** The note thread's head (card-polish FE_02): the count on the left, as plain text, and one toggle
 * that always sits on the right (maintainer, 2026-10-19: it never jumps sides): Hide while the thread
 * shows, Show while it is put away, when the count reads `hidden` ("2 notes · 1 new reply"). Its
 * `data-notes`, `hide` or `show`, is what the page sends, as `notes-hide` or `notes-show`
 * (note-hide.ts); `update()` keeps focus on it when the thread is drawn again. */
function notesHead(v: NotesView): string {
  const shown = v.hidden === undefined;
  return `<div class="vb-node-notes-head"><span class="vb-node-notes-count">${esc(v.hidden ?? v.count)}</span>`
    + `<button type="button" class="vb-node-notes-toggle" data-notes="${shown ? 'hide' : 'show'}" aria-label="${esc(v.toggle)}">${shown ? uiCommonWords.hide : nodeWords.show}</button></div>`;
}

/** A note's or reply's time (card-polish FE_02): said once to screen readers after who wrote it, and
 * drawn in a chip at the box's top right on hover and keyboard focus only (node-notes.css), with the
 * whole date and time as its `title`. `now` decides "Today" and "Yesterday" (`noteTime`). */
function timeMarkup(at: string, now: Date): string {
  const t = esc(noteTime(at, now));
  return `<span class="vb-visually-hidden"> · ${t}</span><span class="vb-note-time" aria-hidden="true" title="${esc(fullTime(at))}">${t}</span>`;
}

/** The "Your note" block's contents (2e_FE_01 ruling 7): the head (`notesHead`), then the card's
 * conversation in `notesView`'s order, oldest first (review-polish ruling 8): each note with its
 * replies under it, an orphan reply in its place; put away, the head alone. Each note is
 * Markdown (D-023) clamped to three lines, carries `data-note`, its seq, so a click opens it, and
 * `data-at`, its time (`timeMarkup`), and is a tab stop (Enter opens it, `VbNode`). Each also holds
 * the note in full as a hover tip (found-in-use FE_04, `bindNoteTip`): hidden for screen readers,
 * which read the note itself, and shown only when the note is cut and the notePreview flag is on. */
export function notesMarkup(v: NotesView, now = new Date()): string {
  if (v.hidden !== undefined) return notesHead(v);
  return notesHead(v) + v.entries.map((x) => {
    if (!isNoteEntry(x)) return replyMarkup(x, now);
    const text = renderMarkdown(x.text);
    return `<div class="vb-node-note" data-note="${x.seq}" data-at="${esc(x.at)}"${x.sent ? ' data-sent' : ''} tabindex="0">`
      + `<span class="vb-node-note-who">${esc(x.who)}</span>${timeMarkup(x.at, now)}<div class="vb-node-note-text">${text}</div>`
      + `<div class="vb-tip vb-note-tip" aria-hidden="true"><div class="vb-tip-body">${text}</div></div></div>${(x.replies ?? []).map((r) => replyMarkup(r, now)).join('')}`;
  }).join('');
}

/** An agent's reply under the note it answers (FE_03 ruling 3): the note's shape, clamp and time,
 * read-only, and a tab stop so focus shows its full text in the same tip (`bindNoteTip`). */
function replyMarkup(r: ReplyEntry, now: Date): string {
  const text = renderMarkdown(r.text);
  return `<div class="vb-node-reply" data-reply="${r.seq}" data-at="${esc(r.at)}" tabindex="0"><span class="vb-node-note-who">${esc(r.who)}</span>`
    + `${timeMarkup(r.at, now)}<div class="vb-node-note-text">${text}</div><div class="vb-tip vb-note-tip" aria-hidden="true"><div class="vb-tip-body">${text}</div></div></div>`;
}

/** The flag button beside Later (cardFlag flag, field report batch 2 assumption A): the person's
 * private mark, no review action, so `data-flag`, not `data-act`; `update()` sets aria-pressed. */
const flagButton = (n: ViewNode): string =>
  `<button type="button" class="vb-act vb-flag" data-flag aria-pressed="false" aria-label="${esc(flagLabel(n))}"`
  + ` title="${nodeWords.flag(FLAG_KEY)}">${svgIcon(FLAG_ICON, 20, 'vb-act-icon')}</button>`;

/** Kind icon, divider, state word (with the tip "Awaiting context" over it while the handover is
 * owed, FE_03), then an app card's status (`appStatus`) and its name (`appName`), then the quick actions and the flag, and at
 * the far right the ⓘ that opens the card's history (card-polish FE_03, the cardHistory flag), whose
 * box follows the footer. Items only, and app cards (whose Allow lives here): a non-item has no state. */
function footer(n: ViewNode, opts: NodeTemplateOptions): string {
  const app = isAppSlot(n, opts);
  if (!isItem(n) && !app) return '';
  const buttons = offers(n).map((a) => button(a, n)).join('') + (opts.flag && isItem(n) ? flagButton(n) : '');
  const actions = buttons ? `<div class="vb-node-actions" role="toolbar" aria-label="${nodeWords.respond}">${buttons}</div>` : '';
  return '<footer class="vb-node-foot"><span class="vb-node-state" aria-hidden="true">'
    + `${svgIcon(KIND_ICON[n.kind], 24, 'vb-node-kico')}<span class="vb-node-sep"></span>`
    + `<span class="vb-node-status"></span><span class="vb-tip vb-status-tip" aria-hidden="true"></span></span>`
    + `${app ? appStatus(n, opts.idPrefix) + appName(n) : ''}${actions}${opts.history ? historyButton(n, popoverId(HISTORY, n, opts.idPrefix)) : ''}${STEP_NAV}</footer>`
    + (opts.history ? historyBox(n, popoverId(HISTORY, n, opts.idPrefix)) : '');
}

/** An app card draws its slot, and so its status in the footer: the appCards flag is not off. */
const isAppSlot = (n: ViewNode, opts: NodeTemplateOptions): boolean => n.kind === 'app' && opts.appCards !== false;

/** The id of app card `n`'s menu, which "Allowed ▾" controls (`prefix`: the mount's, NodeTemplateOptions.idPrefix). */
export const appMenuId = (n: ViewNode, prefix = ''): string => `${prefix}vb-app-menu-${n.id}`;

/** An app card's status, the footer's left-side slot after the kind icon (card-polish FE_01; the
 * row over the panel is gone): Allow (the accent button, its reason as its tip and in its name)
 * while the app's tools wait, or "Allowed ▾", a menu button whose one item is Stop app, once the
 * person allowed this version, or nothing. `update()` shows one, names them and closes the menu; the
 * page acts on `data-app-act` and opens the menu on `data-app-menu` (app-cards.ts). The menu takes
 * the board's menu look (`vb-menu-list`, `vb-menu-item`) and opens upward, over the panel. */
function appStatus(n: ViewNode, prefix?: string): string {
  const menu = esc(appMenuId(n, prefix));
  return '<div class="vb-app-status">'
    + '<button type="button" class="vb-pop-btn vb-pop-primary" data-app-act="app-allow" hidden>' + nodeWords.allow + '</button>'
    + `<button type="button" class="vb-pop-btn vb-app-allowed" data-app-menu aria-haspopup="menu" aria-expanded="false" aria-controls="${menu}" hidden>`
    + '' + nodeWords.allowed + '<span class="vb-app-caret" aria-hidden="true">▾</span></button>'
    + `<div class="vb-menu-list vb-app-menu" id="${menu}" role="menu" hidden>`
    + '<button type="button" class="vb-menu-item" role="menuitem" tabindex="-1" data-app-act="app-revoke">' + nodeWords.stopApp + '</button></div></div>';
}

/** An app card's name in its footer, the window's bar (card-polish FE_04, the appTitle flag; CSS
 * hides it with the flag off): the app's name (`AppCardView.name`, which `update()` writes in place
 * of the card's title once list_apps answers), one line taking the room left, cut with "…", and the
 * whole name in a hover tip (`bindAppNameTip`) for sighted readers only: it is the same text. */
const appName = (n: ViewNode): string =>
  `<span class="vb-app-name"><span class="vb-app-name-text">${esc(n.title)}</span>`
  + `<span class="vb-tip vb-app-name-tip" aria-hidden="true">${esc(n.title)}</span></span>`;

/** The stepper (FE_02 ruling 3), which takes the footer's place while a changed card is open:
 * "Update 2 of 3", Back and Next. Shown and counted by `update()`. */
const STEP_NAV = '<div class="vb-node-stepnav" hidden><span class="vb-node-stepcount"></span>'
  + '<button type="button" class="vb-pop-btn" data-step="back">' + nodeWords.back + '</button>'
  + '<button type="button" class="vb-pop-btn vb-pop-primary" data-step="next">' + nodeWords.next + '</button></div>';

/** The id of card `n`'s step section, which its "N updates" tab controls. */
export const stepsId = (n: ViewNode, prefix = ''): string => `${prefix}vb-steps-${n.id}`;

/** The step section's contents (FE_02 ruling 3, mockup 03 Part B option B): the version, when and
 * who; the change chips; what the text gained; a link to where the change came from (`data-source`,
 * the page's chat). Past the last step, "You're up to date". */
export function stepMarkup(v: UpdatesView): string {
  if (!v.step) return v.done ? '<p class="vb-step-done">' + nodeWords.youReUpToDate + '</p>' : '';
  const { head, chips, lines, source } = v.step;
  const link = source ? `<button type="button" class="vb-step-src" data-source>${esc(source)}</button>` : '';
  const list = chips.length
    ? `<ul class="vb-step-chips" aria-label="${nodeWords.changes}">${chips.map((c) => `<li data-change="${c.change}">${esc(c.text)}</li>`).join('')}</ul>` : '';
  // What the text gained is Markdown like the body it joins (D-023); the renderer escapes it.
  return `<p class="vb-step-head">${esc(head)}</p>${list}${lines.map((l) => `<div class="vb-step-line">${renderMarkdown(l)}</div>`).join('')}${link}`;
}

/** The tabs on the bottom border (FE_01 ruling 2): each popover's, opening its box beside the card
 * (the card popover, node-popover.ts), then "N updates" (FE_02), which opens the step section in the
 * card instead, then NEW (stage5-follow-ups FE_01), a label that opens nothing. Every tab is hidden until it applies (`update()`), so the card's size never changes
 * for one. Items only. The handover box is long and scrolls, so it is a tab stop while it shows (WCAG 2.1.1);
 * the proposal box holds buttons and is not. */
const POPOVERS = ['proposal', 'handover'] as const;
export type PopoverName = (typeof POPOVERS)[number];

/** The id of card `n`'s box `name`, which its tab controls. */
export const popoverId = (name: string, n: ViewNode, prefix = ''): string => `${prefix}vb-pop-${name}-${n.id}`;

function bottomTabs(n: ViewNode, prefix?: string): string {
  if (!isItem(n)) return '';
  const tabs = POPOVERS.map((p) => `<button type="button" class="vb-node-btab" data-tab="${p}" aria-haspopup="dialog"`
    + ` aria-expanded="false" aria-controls="${esc(popoverId(p, n, prefix))}" hidden></button>`).join('')
    + `<button type="button" class="vb-node-btab" data-tab="updates" aria-expanded="false" aria-controls="${esc(stepsId(n, prefix))}" hidden></button>`
    // NEW is a label, not a button (nothing to open); the card's name says "new", so it is hidden from the tree.
    + '<span class="vb-node-btab" data-tab="new" aria-hidden="true" hidden>' + nodeWords.newBadge + '</span>';
  const boxes = POPOVERS.map((p) =>
    `<div class="vb-tip vb-card-pop" data-pop="${p}" id="${esc(popoverId(p, n, prefix))}" role="dialog" tabindex="${p === 'handover' ? 0 : -1}"></div>`).join('');
  return `<div class="vb-node-btabs">${tabs}</div>${boxes}`;
}

/** The proposal box's contents (FE_01 ruling 3, mockup 03 option C): each proposal, newest first,
 * with who, what, from where and when, then Reject and Accept. Out of date, the reason shows and
 * Accept is aria-disabled, described by it. The page acts on `data-proposal` and `data-answer`. */
export function proposalsMarkup(v: ProposalsView, prefix = ''): string {
  return v.entries.map((p) => {
    const why = `${prefix}vb-prop-why-${p.seq}`;
    const off = p.why ? ` aria-disabled="true" aria-describedby="${why}"` : '';
    const btn = (answer: string, label: string, text: string, extra = '') =>
      `<button type="button" class="vb-pop-btn${answer === 'accept' ? ' vb-pop-primary' : ''}" data-proposal="${p.seq}"`
      + ` data-answer="${answer}" aria-label="${esc(label)}"${extra}>${text}</button>`;
    return `<div class="vb-prop" role="group" data-proposal="${p.seq}"${p.stale ? ' data-stale' : ''} aria-label="${esc(p.what)}">`
      + `<p class="vb-prop-head">${esc(p.head)}</p><p class="vb-prop-what">${esc(p.what)}</p>`
      + (p.from ? `<p class="vb-prop-from">${esc(p.from)}</p>` : '')
      + (p.why ? `<p class="vb-prop-why" id="${why}">${esc(p.why)}</p>` : '')
      + `<div class="vb-prop-acts">${btn('reject', p.reject, nodeWords.reject2)}${btn('accept', p.accept, nodeWords.accept, off)}</div></div>`;
  }).join('');
}

/** The handover box's contents (FE_03 ruling 2): situation, background, assessment and recommendation
 * as headed Markdown sections, then the sources as a list. */
export function handoverMarkup(v: HandoverView): string {
  const sources = v.sources.length
    ? `<section class="vb-hand"><h4 class="vb-hand-head">${nodeWords.sources}</h4><ul class="vb-hand-sources">${v.sources.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : '';
  return v.sections.map((x) => `<section class="vb-hand"><h4 class="vb-hand-head">${esc(x.head)}</h4>`
    + `<div class="vb-hand-text">${renderMarkdown(x.text)}</div></section>`).join('') + sources;
}

export interface NodeTemplateOptions {
  /** Draw the size control (D-030); the page passes it when the nodeSize flag is on. Never on an app card. */
  sizeControl?: boolean;
  /** false: the appCards flag is off, so an app card is a plain card saying so (ruling 13). */
  appCards?: boolean;
  /** Draw the flag button beside Later; the page passes it when the cardFlag flag is on. */
  flag?: boolean;
  /** Draw the ⓘ and the history box on every card with a footer; the page passes it when the cardHistory flag is on. */
  history?: boolean;
  /** Put before every id the card sets (its popovers, step section, app menu), so two boards on one page
   * repeat none: each mount has its own (the board's `mount`). Empty for the first, and for the gallery. */
  idPrefix?: string;
}

const SIZE_PICKS: readonly NodeSize[] = ['s', 'm', 'l'];

/** Option A (mockup 07): a glyph in the top-right border gap; the S / M / L / Auto pill lifts
 *  above the top edge on hover or keyboard focus. Labels, pressed state and the picked letter are
 *  set by `update()`. The pill is hidden at rest, so only the glyph is in the tab order. */
function sizeControl(n: ViewNode): string {
  const name = isItem(n) ? nodeWords.card(n.n) : nodeWords.card2(n.title);
  const opts = SIZE_PICKS.map((t) =>
    `<button type="button" class="vb-size-opt" data-size-pick="${t}" aria-pressed="false">${SIZE_LETTER[t]}</button>`).join('');
  return `<div class="vb-size" role="group" aria-label="${nodeWords.sizeOf(esc(name))}">`
    + `<button type="button" class="vb-size-trig" aria-expanded="false">${svgIcon(SIZE_ICON, 24, 'vb-size-glyph')}`
    + '<span class="vb-size-shown"></span></button>'
    + `<div class="vb-size-menu">${opts}<span class="vb-size-sep" aria-hidden="true"></span>`
    + '<button type="button" class="vb-size-opt" data-size-pick="auto" aria-pressed="false" aria-label="' + nodeWords.automaticSize + '">' + nodeWords.auto + '</button>'
    + '</div></div>';
}

/** What an app card shows in place of its panel (node-app.ts `appView`): the app's icon, or the
 * warning one when something is wrong, a line in bold, a line under it, the problems (a list that
 * scrolls, so a tab stop) and the try-again button. Empty while the panel shows. */
export function appStateMarkup(v: AppCardView): string {
  if (v.frame) return '';
  const warn = v.state === 'invalid' || v.state === 'broken';
  const problems = v.problems
    ? `<ul class="vb-app-problems" tabindex="0" aria-label="${nodeWords.problems}">${v.problems.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : '';
  const retry = v.retry
    ? `<button type="button" class="vb-pop-btn" data-app-act="retry" aria-label="${esc(v.names.retry ?? v.retry)}">${esc(v.retry)}</button>` : '';
  return svgIcon(warn ? KIND_ICON.risk : KIND_ICON.app, 24, 'vb-app-icon')
    + (v.head ? `<p class="vb-app-head">${esc(v.head)}</p>` : '') + (v.text ? `<p class="vb-app-text">${esc(v.text)}</p>` : '')
    + problems + retry;
}

/** An app card's panel slot, in place of the Markdown body (ruling 3): the frame at the panel's size
 * (`<vb-app-frame>`, which the page loads) and the state view over it, drawn here for `checking`
 * until `update()` applies the card's state. Allow and Stop app are in the footer (`appStatus`). */
function appSlot(n: ViewNode): string {
  const ref = n.app ?? { id: '' };
  const { w, h } = panelSize(ref);
  return '<div class="vb-app" data-app-state="checking" aria-busy="true">'
    + `<vb-app-frame data-app="${esc(ref.id)}" data-label="${esc(n.title)}" data-w="${w}" data-h="${h}"></vb-app-frame>`
    + `<div class="vb-app-state">${appStateMarkup(appView(n))}</div></div>`;
}

/** The content under the title: an app card's slot (or, with the flag off, a line saying so), else
 * the body as Markdown (D-023; the renderer escapes every text run, so its output is safe markup). */
function bodyMarkup(n: ViewNode, opts: NodeTemplateOptions): string {
  if (n.kind === 'app') return isAppSlot(n, opts) ? appSlot(n) : `<div class="vb-node-body">${renderMarkdown(APPS_OFF)}</div>`;
  return n.body ? `<div class="vb-node-body">${renderMarkdown(n.body)}</div>` : '';
}

export function nodeTemplate(n: ViewNode, opts: NodeTemplateOptions = {}): string {
  const body = bodyMarkup(n, opts);
  const tags = n.tags?.length
    ? `<ul class="vb-node-tags">${n.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const note = '<div class="vb-node-notes" hidden></div>';
  // An item's step section (FE_02), right under the text a change touched.
  const steps = isItem(n) ? `<div class="vb-node-steps" id="${esc(stepsId(n, opts.idPrefix))}" role="region" aria-live="polite" hidden></div>` : '';
  return `${tabs(n)}${opts.sizeControl && n.kind !== 'app' ? sizeControl(n) : ''}<div class="vb-node-content"><h3 class="vb-node-title">${esc(n.title)}</h3>`
    + `${body}${tags}${steps}${note}</div>${footer(n, opts)}${bottomTabs(n, opts.idPrefix)}`;
}
