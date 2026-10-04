// Node pattern, layer 2 (template): one pure function from a node to its markup. Tokens only;
// no inline styles (the page's CSP forbids them). State changes are applied in place by the
// element (`VbNode.update`: data-status, aria-pressed), so this runs once per view version.
import type { ActionId, ViewNode } from '../../../format/src/index.ts';
import { NODE_TYPES } from '../../../format/src/index.ts';
import { ACTIONS } from '../../../actions/src/index.ts';
import { buttonLabel, offers } from './node-core.ts';

export const ICONS: Partial<Record<ActionId, string>> = {
  ack: '<path d="M4 10.5l4 4 8-9"/>',
  drop: '<path d="M5 5l10 10M15 5L5 15"/>',
  comment: '<path d="M4 5h12v8H9l-4 3v-3H4z"/>',
  context: '<path d="M7.5 7.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V12M10 15v.01"/>',
  later: '<path d="M6 4h8v12l-4-3-4 3z"/>',
};

export const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const icon = (a: ActionId) =>
  `<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">${ICONS[a] ?? ''}</svg>`;

export function nodeTemplate(n: ViewNode): string {
  const num = n.n !== undefined ? `<span class="vb-node-num" aria-hidden="true">${n.n}</span>` : '';
  const body = n.body ? `<p class="vb-node-body">${esc(n.body)}</p>` : '';
  const tags = n.tags?.length
    ? `<ul class="vb-node-tags">${n.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const buttons = offers(n)
    .map((a) => `<button type="button" class="vb-act" data-act="${a}" aria-label="${esc(buttonLabel(a, n))}"`
      + ` title="${esc(ACTIONS[a].label)}${ACTIONS[a].key ? ` · ${ACTIONS[a].key}` : ''}">${icon(a)}</button>`)
    .join('');
  const actions = buttons ? `<div class="vb-node-actions" role="toolbar" aria-label="Respond">${buttons}</div>` : '';
  return `<header class="vb-node-head">${num}<span class="vb-node-kind">${NODE_TYPES[n.kind].label}</span>`
    + `<span class="vb-node-status" aria-hidden="true"></span><span class="vb-node-pin" aria-hidden="true" title="Moved by you">◆</span></header>`
    + `<h3 class="vb-node-title">${esc(n.title)}</h3>${body}${tags}`
    + `<p class="vb-node-notes" hidden></p>${actions}`;
}
