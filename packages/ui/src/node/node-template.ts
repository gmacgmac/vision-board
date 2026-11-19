// Node pattern, layer 2 (template): one pure function from a node to its markup. Tokens only;
// no inline styles (the page's CSP forbids them). State changes are applied in place by the
// element (`VbNode.update`: data-status, the marks, the boxes' contents), so this runs
// once per view version. Every node carries its actions on its edges, where the board's skin puts them (D-099,
// D-100; node-edges.ts); an app node is a window (node-window.ts). No footer.
import type { ViewNode } from '#format';
import type { HandoverView, ProposalsView } from './node-core.ts';
import type { UpdatesView } from './node-updates.ts';
import type { AppCardView } from './node-app.ts';
import { APPS_OFF, appView } from './node-app.ts';
import { panelSize } from '../app-frame/app-frame-core.ts';
import { isItem } from './node-core.ts';
import { KIND_ICON, svgIcon } from './node-icons.ts';
import { esc } from '../markdown/inline.ts';
import type { MarkdownOptions } from '../markdown/render.ts';
import { renderMarkdown } from '../markdown/render.ts';
import { HISTORY } from './node-history.ts';
import * as nodeWords from '../words/node.ts';
import type { SkinDef } from '../skins.ts';
import { SKIN_DEFS } from '../skins.ts';
import type { IconLibrary } from '../icons/icon.ts';
import { edgesMarkup } from './node-edges.ts';
import { drawerId, windowMarkup } from './node-window.ts';
import { datedOf } from './node-date.ts';

// One escaper for every text run in packages/ui: the Markdown renderer's, re-exported here.
export { esc } from '../markdown/inline.ts';

/** An app card is drawn as a window (node-window.ts), its slot under the bar: the appCards flag is not off. */
export const isWindow = (n: ViewNode, opts: NodeTemplateOptions): boolean => n.kind === 'app' && opts.appCards !== false;

/** The id of app card `n`'s menu, which "Allowed ▾" controls (`prefix`: the mount's, NodeTemplateOptions.idPrefix). */
export const appMenuId = (n: ViewNode, prefix = ''): string => `${prefix}vb-app-menu-${n.id}`;

/** An app window's status, in its bar (node-window.ts): Allow (the accent button, its reason as its tip and in its name)
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

/** The stepper (FE_02 ruling 3), under the steps in the history box (planner's call 9): "Update 2 of 3", Back and
 * Next. Shown and counted by `update()`. */
const STEP_NAV = '<div class="vb-node-stepnav" hidden><span class="vb-node-stepcount"></span>'
  + '<button type="button" class="vb-pop-btn" data-step="back">' + nodeWords.back + '</button>'
  + '<button type="button" class="vb-pop-btn vb-pop-primary" data-step="next">' + nodeWords.next + '</button></div>';

/** The id of card `n`'s step section, in its history box. */
export const stepsId = (n: ViewNode, prefix = ''): string => `${prefix}vb-steps-${n.id}`;

/** The step section's contents (FE_02 ruling 3, mockup 03 Part B option B): the version, when and
 * who; the change chips; what the text gained; a link to where the change came from (`data-source`,
 * the page's chat). Past the last step, "You're up to date". */
export function stepMarkup(v: UpdatesView, md?: MarkdownOptions): string {
  if (!v.step) return v.done ? '<p class="vb-step-done">' + nodeWords.youReUpToDate + '</p>' : '';
  const { head, chips, lines, source } = v.step;
  const link = source ? `<button type="button" class="vb-step-src" data-source>${esc(source)}</button>` : '';
  const list = chips.length
    ? `<ul class="vb-step-chips" aria-label="${nodeWords.changes}">${chips.map((c) => `<li data-change="${c.change}">${esc(c.text)}</li>`).join('')}</ul>` : '';
  // What the text gained is Markdown like the body it joins (D-023); the renderer escapes it.
  return `<p class="vb-step-head">${esc(head)}</p>${list}${lines.map((l) => `<div class="vb-step-line">${renderMarkdown(l, md)}</div>`).join('')}${link}`;
}

/** The id of card `n`'s box `name` (history, proposal), which its mark controls. */
export const popoverId = (name: string, n: ViewNode, prefix = ''): string => `${prefix}vb-pop-${name}-${n.id}`;

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
export function handoverMarkup(v: HandoverView, md?: MarkdownOptions): string {
  const sources = v.sources.length
    ? `<section class="vb-hand"><h4 class="vb-hand-head">${nodeWords.sources}</h4><ul class="vb-hand-sources">${v.sources.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : '';
  return v.sections.map((x) => `<section class="vb-hand"><h4 class="vb-hand-head">${esc(x.head)}</h4>`
    + `<div class="vb-hand-text">${renderMarkdown(x.text, md)}</div></section>`).join('') + sources;
}

export interface NodeTemplateOptions {
  /** false: the appCards flag is off, so an app card is a plain node saying so (ruling 13). */
  appCards?: boolean;
  /** Put before every id the card sets (its popovers, step section, app menu), so two boards on one page
   * repeat none: each mount has its own (the board's `mount`). Empty for the first, and for the gallery. */
  idPrefix?: string;
  /** How this card's Markdown renders: the flags and the image route its board was given. */
  markdown?: MarkdownOptions;
  /** Where the board's skin puts the node's marks and answer (D-099, D-100; skins.ts `SKIN_DEFS`); unset, the default skin's. */
  edges?: SkinDef;
  /** The project's icon library the page holds (`list_icons` with `paths`), for a node naming an `x-` icon. */
  icons?: IconLibrary;
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
 * until `update()` applies the card's state. Allow and Stop app are in the window's bar (`appStatus`). */
function appSlot(n: ViewNode): string {
  const ref = n.app ?? { id: '' };
  const { w, h } = panelSize(ref);
  return '<div class="vb-app" data-app-state="checking" aria-busy="true">'
    + `<vb-app-frame data-app="${esc(ref.id)}" data-label="${esc(n.title)}" data-w="${w}" data-h="${h}"></vb-app-frame>`
    + `<div class="vb-app-state">${appStateMarkup(appView(n))}</div></div>`;
}

/** The content under the title: an app card's slot (or, with the flag off, a line saying so), else
 * the body as Markdown (D-023; the renderer escapes every text run, so its output is safe markup), with entries on a
 * dated node. */
function bodyMarkup(n: ViewNode, opts: NodeTemplateOptions): string {
  if (n.kind === 'app') return isWindow(n, opts) ? appSlot(n) : `<div class="vb-node-body">${renderMarkdown(APPS_OFF, opts.markdown)}</div>`;
  // A dated node draws `###` headings and bold leads as entries (D-105 5, PLAN call 9); every other node as before.
  const md = datedOf(n) ? { ...opts.markdown, entries: true } : opts.markdown;
  return n.body ? `<div class="vb-node-body">${renderMarkdown(n.body, md)}</div>` : '';
}

export function nodeTemplate(n: ViewNode, opts: NodeTemplateOptions = {}): string {
  const body = bodyMarkup(n, opts);
  const def = opts.edges ?? SKIN_DEFS.default;
  const tags = n.tags?.length
    ? `<ul class="vb-node-tags">${n.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  // An item's step section (FE_02), right under the text a change touched.
  const steps = isItem(n) ? `<div class="vb-node-steps" id="${esc(stepsId(n, opts.idPrefix))}" role="region" aria-live="polite" hidden></div>` : '';
  const ids = { history: popoverId(HISTORY, n, opts.idPrefix), proposal: popoverId('proposal', n, opts.idPrefix), drawer: drawerId(n, opts.idPrefix) };
  if (isWindow(n, opts)) return windowMarkup(n, { body, status: appStatus(n, opts.idPrefix), steps, stepNav: STEP_NAV, ids });
  return edgesMarkup(n, def, { body, tags, steps, stepNav: STEP_NAV, ids, ...(opts.icons && { icons: opts.icons }) });
}
