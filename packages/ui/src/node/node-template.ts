// Node pattern, layer 2 (template): one pure function from a node to its markup. Tokens only;
// no inline styles (the page's CSP forbids them). State changes are applied in place by the
// element (`VbNode.update`: data-status, aria-pressed, the status word, the note), so this runs
// once per view version. The look is board v3's card (D-024, mockup 01b): content first, number
// and kind as tabs in gaps cut from the top border, kind icon, state word and buttons in a footer.
import type { ActionId, NodeSize, ViewNode } from '../../../format/src/index.ts';
import { NODE_TYPES } from '../../../format/src/index.ts';
import { ACTIONS } from '../../../actions/src/index.ts';
import type { HandoverView, NotesView, ProposalsView, ReplyEntry } from './node-core.ts';
import type { UpdatesView } from './node-updates.ts';
import { buttonLabel, FLAG_KEY, flagLabel, isItem, offers, SIZE_LETTER } from './node-core.ts';
import { ACTION_ICON, FLAG_ICON, KIND_ICON, SIZE_ICON, svgIcon } from './node-icons.ts';
import { esc } from '../markdown/inline.ts';
import { renderMarkdown } from '../markdown/render.ts';

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
    + `<span class="vb-node-pin" aria-hidden="true" title="Moved by you">◆</span>${notePin}`;
}

/** The "Your note" block's contents (2e_FE_01 ruling 7): "N notes" when there are several, then
 * each note, latest first, as Markdown (D-023) clamped to three lines. Each carries `data-note`,
 * its seq, so a click opens it, and is a tab stop (Enter opens it, `VbNode`). Each also holds the
 * note in full as a hover tip (found-in-use FE_04, `bindNoteTip`): hidden for screen readers,
 * which read the note itself, and shown only when the note is cut and the notePreview flag is on. */
export function notesMarkup(v: NotesView): string {
  const count = v.count ? `<span class="vb-node-notes-count">${esc(v.count)}</span>` : '';
  return count + v.entries.map((x) => {
    const text = renderMarkdown(x.text);
    return `<div class="vb-node-note" data-note="${x.seq}"${x.sent ? ' data-sent' : ''} tabindex="0">`
      + `<span class="vb-node-note-who">${esc(x.who)}</span><div class="vb-node-note-text">${text}</div>`
      + `<div class="vb-tip vb-note-tip" aria-hidden="true">${text}</div></div>${(x.replies ?? []).map(replyMarkup).join('')}`;
  }).join('') + (v.orphans ?? []).map(replyMarkup).join('');
}

/** An agent's reply under the note it answers (FE_03 ruling 3): the note's shape and clamp, read-only,
 * and a tab stop so focus shows its full text in the same tip (`bindNoteTip`). */
function replyMarkup(r: ReplyEntry): string {
  const text = renderMarkdown(r.text);
  return `<div class="vb-node-reply" data-reply="${r.seq}" tabindex="0"><span class="vb-node-note-who">${esc(r.who)}</span>`
    + `<div class="vb-node-note-text">${text}</div><div class="vb-tip vb-note-tip" aria-hidden="true">${text}</div></div>`;
}

/** The flag button beside Later (cardFlag flag, field report batch 2 assumption A): the person's
 * private mark, no review action, so `data-flag`, not `data-act`; `update()` sets aria-pressed. */
const flagButton = (n: ViewNode): string =>
  `<button type="button" class="vb-act vb-flag" data-flag aria-pressed="false" aria-label="${esc(flagLabel(n))}"`
  + ` title="Flag · ${FLAG_KEY}">${svgIcon(FLAG_ICON, 20, 'vb-act-icon')}</button>`;

/** Kind icon, divider, state word (with the tip "Awaiting context" over it while the handover is
 * owed, FE_03), then the quick actions and the flag. Items only: a non-item has no state. */
function footer(n: ViewNode, opts: NodeTemplateOptions): string {
  if (!isItem(n)) return '';
  const buttons = offers(n).map((a) => button(a, n)).join('') + (opts.flag ? flagButton(n) : '');
  const actions = buttons ? `<div class="vb-node-actions" role="toolbar" aria-label="Respond">${buttons}</div>` : '';
  return '<footer class="vb-node-foot"><span class="vb-node-state" aria-hidden="true">'
    + `${svgIcon(KIND_ICON[n.kind], 24, 'vb-node-kico')}<span class="vb-node-sep"></span>`
    + `<span class="vb-node-status"></span><span class="vb-tip vb-status-tip" aria-hidden="true"></span></span>${actions}${STEP_NAV}</footer>`;
}

/** The stepper (FE_02 ruling 3), which takes the footer's place while a changed card is open:
 * "Update 2 of 3", Back and Next. Shown and counted by `update()`. */
const STEP_NAV = '<div class="vb-node-stepnav" hidden><span class="vb-node-stepcount"></span>'
  + '<button type="button" class="vb-pop-btn" data-step="back">Back</button>'
  + '<button type="button" class="vb-pop-btn vb-pop-primary" data-step="next">Next</button></div>';

/** The id of card `n`'s step section, which its "N updates" tab controls. */
export const stepsId = (n: ViewNode): string => `vb-steps-${n.id}`;

/** The step section's contents (FE_02 ruling 3, mockup 03 Part B option B): the version, when and
 * who; the change chips; what the text gained; a link to where the change came from (`data-source`,
 * the page's chat). Past the last step, "You're up to date". */
export function stepMarkup(v: UpdatesView): string {
  if (!v.step) return v.done ? '<p class="vb-step-done">You\'re up to date</p>' : '';
  const { head, chips, lines, source } = v.step;
  const link = source ? `<button type="button" class="vb-step-src" data-source>${esc(source)}</button>` : '';
  const list = chips.length
    ? `<ul class="vb-step-chips" aria-label="Changes">${chips.map((c) => `<li data-change="${c.change}">${esc(c.text)}</li>`).join('')}</ul>` : '';
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
export const popoverId = (name: string, n: ViewNode): string => `vb-pop-${name}-${n.id}`;

function bottomTabs(n: ViewNode): string {
  if (!isItem(n)) return '';
  const tabs = POPOVERS.map((p) => `<button type="button" class="vb-node-btab" data-tab="${p}" aria-haspopup="dialog"`
    + ` aria-expanded="false" aria-controls="${esc(popoverId(p, n))}" hidden></button>`).join('')
    + `<button type="button" class="vb-node-btab" data-tab="updates" aria-expanded="false" aria-controls="${esc(stepsId(n))}" hidden></button>`
    // NEW is a label, not a button (nothing to open); the card's name says "new", so it is hidden from the tree.
    + '<span class="vb-node-btab" data-tab="new" aria-hidden="true" hidden>NEW</span>';
  const boxes = POPOVERS.map((p) =>
    `<div class="vb-tip vb-card-pop" data-pop="${p}" id="${esc(popoverId(p, n))}" role="dialog" tabindex="${p === 'handover' ? 0 : -1}"></div>`).join('');
  return `<div class="vb-node-btabs">${tabs}</div>${boxes}`;
}

/** The proposal box's contents (FE_01 ruling 3, mockup 03 option C): each proposal, newest first,
 * with who, what, from where and when, then Reject and Accept. Out of date, the reason shows and
 * Accept is aria-disabled, described by it. The page acts on `data-proposal` and `data-answer`. */
export function proposalsMarkup(v: ProposalsView): string {
  return v.entries.map((p) => {
    const why = `vb-prop-why-${p.seq}`;
    const off = p.why ? ` aria-disabled="true" aria-describedby="${why}"` : '';
    const btn = (answer: string, label: string, text: string, extra = '') =>
      `<button type="button" class="vb-pop-btn${answer === 'accept' ? ' vb-pop-primary' : ''}" data-proposal="${p.seq}"`
      + ` data-answer="${answer}" aria-label="${esc(label)}"${extra}>${text}</button>`;
    return `<div class="vb-prop" role="group" data-proposal="${p.seq}"${p.stale ? ' data-stale' : ''} aria-label="${esc(p.what)}">`
      + `<p class="vb-prop-head">${esc(p.head)}</p><p class="vb-prop-what">${esc(p.what)}</p>`
      + (p.from ? `<p class="vb-prop-from">${esc(p.from)}</p>` : '')
      + (p.why ? `<p class="vb-prop-why" id="${why}">${esc(p.why)}</p>` : '')
      + `<div class="vb-prop-acts">${btn('reject', p.reject, 'Reject')}${btn('accept', p.accept, 'Accept', off)}</div></div>`;
  }).join('');
}

/** The handover box's contents (FE_03 ruling 2): situation, background, assessment and recommendation
 * as headed Markdown sections, then the sources as a list. */
export function handoverMarkup(v: HandoverView): string {
  const sources = v.sources.length
    ? `<section class="vb-hand"><h4 class="vb-hand-head">Sources</h4><ul class="vb-hand-sources">${v.sources.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>` : '';
  return v.sections.map((x) => `<section class="vb-hand"><h4 class="vb-hand-head">${esc(x.head)}</h4>`
    + `<div class="vb-hand-text">${renderMarkdown(x.text)}</div></section>`).join('') + sources;
}

export interface NodeTemplateOptions {
  /** Draw the size control (D-030); the page passes it when the nodeSize flag is on. */
  sizeControl?: boolean;
  /** Draw the flag button beside Later; the page passes it when the cardFlag flag is on. */
  flag?: boolean;
}

const SIZE_PICKS: readonly NodeSize[] = ['s', 'm', 'l'];

/** Option A (mockup 07): a glyph in the top-right border gap; the S / M / L / Auto pill lifts
 *  above the top edge on hover or keyboard focus. Labels, pressed state and the picked letter are
 *  set by `update()`. The pill is hidden at rest, so only the glyph is in the tab order. */
function sizeControl(n: ViewNode): string {
  const name = isItem(n) ? `card ${n.n}` : `card: ${n.title}`;
  const opts = SIZE_PICKS.map((t) =>
    `<button type="button" class="vb-size-opt" data-size-pick="${t}" aria-pressed="false">${SIZE_LETTER[t]}</button>`).join('');
  return `<div class="vb-size" role="group" aria-label="Size of ${esc(name)}">`
    + `<button type="button" class="vb-size-trig" aria-expanded="false">${svgIcon(SIZE_ICON, 24, 'vb-size-glyph')}`
    + '<span class="vb-size-shown"></span></button>'
    + `<div class="vb-size-menu">${opts}<span class="vb-size-sep" aria-hidden="true"></span>`
    + '<button type="button" class="vb-size-opt" data-size-pick="auto" aria-pressed="false" aria-label="Automatic size">Auto</button>'
    + '</div></div>';
}

export function nodeTemplate(n: ViewNode, opts: NodeTemplateOptions = {}): string {
  // The body is Markdown (D-023); the renderer escapes every text run, so its output is safe markup.
  const body = n.body ? `<div class="vb-node-body">${renderMarkdown(n.body)}</div>` : '';
  const tags = n.tags?.length
    ? `<ul class="vb-node-tags">${n.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const note = '<div class="vb-node-notes" hidden></div>';
  // An item's step section (FE_02), right under the text a change touched.
  const steps = isItem(n) ? `<div class="vb-node-steps" id="${esc(stepsId(n))}" role="region" aria-live="polite" hidden></div>` : '';
  return `${tabs(n)}${opts.sizeControl ? sizeControl(n) : ''}<div class="vb-node-content"><h3 class="vb-node-title">${esc(n.title)}</h3>`
    + `${body}${tags}${steps}${note}</div>${footer(n, opts)}${bottomTabs(n)}`;
}
