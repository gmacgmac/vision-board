// Chat header pattern, layer 2 (template): the agent and the model (a picker when there is a
// choice), the status word with its dot, then Stop and New session.
import { esc } from '../esc.ts';
import type { ChatOption, HeaderView } from './header-core.ts';

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
