// Chat header pattern, layer 2 (template): the agent and the model (a picker when there is a
// choice), the status word with its dot, then Stop and New session.
import { esc } from '../esc.ts';
import type { AllowedItem, ChatOption, HeaderView } from './header-core.ts';

function field(name: 'agent' | 'model', label: string, f: { id: string; label: string; options?: readonly ChatOption[] }): string {
  if (!f.options) return `<span class="chat-hd-${name}" title="${esc(label)}">${esc(f.label)}</span>`;
  const opts = f.options.map((o) => `<option value="${esc(o.id)}"${o.id === f.id ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
  return `<select class="chat-hd-pick chat-hd-${name}" data-pick="${name}" aria-label="${esc(label)}">${opts}</select>`;
}

export function headerTemplate(v: HeaderView): string {
  const who = `<div class="chat-hd-who">${field('agent', 'Agent', v.agent)}<span class="chat-hd-sep" aria-hidden="true">·</span>`
    + `${field('model', 'Model', v.model)}</div>`;
  const status = `<p class="chat-hd-status" data-tone="${v.status.tone}" data-status="${v.status.kind}">`
    + `<span class="chat-hd-dot" aria-hidden="true"></span><span class="chat-sr">Status: </span>${esc(v.status.label)}</p>`;
  const acts = '<div class="chat-hd-acts">'
    + `<button type="button" class="chat-btn" data-do="stop"${v.stop ? '' : ' disabled'}>Stop</button>`
    + '<button type="button" class="chat-btn" data-do="new">New session</button></div>';
  return `${who}${status}${acts}`;
}

export const ALLOWED_LABEL = 'Allowed for this folder';
const CHEVRON = '<svg class="chat-hd-mark" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">'
  + '<path d="M3 4.5 6 7.5l3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const row = (a: AllowedItem): string => `<li><span class="chat-hd-what">${esc(a.label)}</span>`
  + `<button type="button" class="chat-btn" data-forget="${esc(a.id)}" aria-label="Forget: ${esc(a.label)}">Forget</button></li>`;

/** What was allowed for the folder: a button with the count that opens (`open`) a list of each yes in words,
 *  with Forget, in the region `id`. Nothing when the host keeps no list (`allowed` undefined). */
export function allowedTemplate(allowed: readonly AllowedItem[] | undefined, open: boolean, id: string): string {
  if (!allowed) return '';
  const count = allowed.length ? ` <span class="chat-hd-count">${allowed.length}</span>` : '';
  const button = `<button type="button" class="chat-hd-allow" aria-expanded="${open}"${open ? ` aria-controls="${esc(id)}"` : ''} data-allowed>`
    + `${ALLOWED_LABEL}${count}${CHEVRON}</button>`;
  if (!open) return button;
  const body = allowed.length
    ? `<ul class="chat-hd-list">${allowed.map(row).join('')}</ul>`
    : '<p class="chat-hd-none">Nothing yet. Choose Allow for this folder when the agent asks.</p>';
  return `${button}<div class="chat-hd-pop" id="${esc(id)}" role="region" aria-label="${ALLOWED_LABEL}">`
    + `<p class="chat-hd-pop-h" aria-hidden="true">${ALLOWED_LABEL}</p>${body}</div>`;
}
