// Item pattern, layer 2 (template): one pure function from an item to its markup. Tokens only;
// no inline styles (the page's CSP forbids them). State changes are applied in place by the
// page (data-status, aria-pressed), so this runs once per view version, not per click.
import type { ViewNode } from '../../../format/src/view.ts';
import type { ActionId } from '../../../format/src/transcript.ts';
import { ACTIONS } from '../../../actions/src/registry.ts';
import { buttonLabel, KIND_LABEL, offers } from './item-core.ts';

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

export function itemTemplate(n: ViewNode): string {
  const num = n.n !== undefined ? `<span class="vb-item-num" aria-hidden="true">${n.n}</span>` : '';
  const body = n.body ? `<p class="vb-item-body">${esc(n.body)}</p>` : '';
  const tags = n.tags?.length
    ? `<ul class="vb-item-tags">${n.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const buttons = offers(n)
    .map((a) => `<button type="button" class="vb-act" data-act="${a}" aria-label="${esc(buttonLabel(a, n))}"`
      + ` title="${esc(ACTIONS[a].label)}${ACTIONS[a].key ? ` · ${ACTIONS[a].key}` : ''}">${icon(a)}</button>`)
    .join('');
  const actions = buttons ? `<div class="vb-item-actions" role="toolbar" aria-label="Respond">${buttons}</div>` : '';
  return `<header class="vb-item-head">${num}<span class="vb-item-kind">${KIND_LABEL[n.kind]}</span>`
    + `<span class="vb-item-status" aria-hidden="true"></span><span class="vb-item-pin" aria-hidden="true" title="Moved by you">◆</span></header>`
    + `<h3 class="vb-item-title">${esc(n.title)}</h3>${body}${tags}`
    + `<p class="vb-item-notes" hidden></p>${actions}`;
}
