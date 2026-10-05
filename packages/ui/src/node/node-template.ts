// Node pattern, layer 2 (template): one pure function from a node to its markup. Tokens only;
// no inline styles (the page's CSP forbids them). State changes are applied in place by the
// element (`VbNode.update`: data-status, aria-pressed, the status word, the note), so this runs
// once per view version. The look is board v3's card (D-024, mockup 01b): content first, number
// and kind as tabs in gaps cut from the top border, kind icon, state word and buttons in a footer.
import type { ActionId, NodeSize, ViewNode } from '../../../format/src/index.ts';
import { NODE_TYPES } from '../../../format/src/index.ts';
import { ACTIONS } from '../../../actions/src/index.ts';
import { buttonLabel, isItem, offers, SIZE_LETTER } from './node-core.ts';
import { ACTION_ICON, KIND_ICON, SIZE_ICON, svgIcon } from './node-icons.ts';
import { esc } from '../markdown/inline.ts';
import { renderMarkdown } from '../markdown/render.ts';

// One escaper for every text run in packages/ui: the Markdown renderer's, re-exported here.
export { esc } from '../markdown/inline.ts';

const button = (a: ActionId, n: ViewNode): string =>
  `<button type="button" class="vb-act" data-act="${a}" aria-label="${esc(buttonLabel(a, n))}"`
  + ` title="${esc(ACTIONS[a].label)}${ACTIONS[a].key ? ` · ${ACTIONS[a].key}` : ''}">`
  + `${svgIcon(ACTION_ICON[a] ?? '', 20, 'vb-act-icon')}</button>`;

/** The tabs on the top border: number (items only), kind, and the moved-by-you marker. */
function tabs(n: ViewNode): string {
  const num = isItem(n) ? `<span class="vb-node-num" aria-hidden="true">${n.n}</span>` : '';
  return `${num}<span class="vb-node-kind">${NODE_TYPES[n.kind].label}</span>`
    + '<span class="vb-node-pin" aria-hidden="true" title="Moved by you">◆</span>';
}

/** Kind icon, divider, state word, then the quick actions. Items only: a non-item has no state. */
function footer(n: ViewNode): string {
  if (!isItem(n)) return '';
  const buttons = offers(n).map((a) => button(a, n)).join('');
  const actions = buttons ? `<div class="vb-node-actions" role="toolbar" aria-label="Respond">${buttons}</div>` : '';
  return '<footer class="vb-node-foot"><span class="vb-node-state" aria-hidden="true">'
    + `${svgIcon(KIND_ICON[n.kind], 24, 'vb-node-kico')}<span class="vb-node-sep"></span>`
    + `<span class="vb-node-status"></span></span>${actions}</footer>`;
}

export interface NodeTemplateOptions {
  /** Draw the size control (D-030); the page passes it when the nodeSize flag is on. */
  sizeControl?: boolean;
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
  const note = '<div class="vb-node-notes" hidden><span class="vb-node-note-who"></span>'
    + '<span class="vb-node-note-text"></span></div>';
  return `${tabs(n)}${opts.sizeControl ? sizeControl(n) : ''}<div class="vb-node-content"><h3 class="vb-node-title">${esc(n.title)}</h3>`
    + `${body}${tags}${note}</div>${footer(n)}`;
}
