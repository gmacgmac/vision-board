// Chat message pattern, layer 2 (template): one message's markup. The person's words exactly as
// typed (no Markdown: they are not read back as markup), with the chips they sent; the agent's
// words through the host's renderer (Markdown on the board). A hidden "You:" or "Agent:" leads
// each, so the log reads who said it.
import { esc } from '../esc.ts';
import type { RenderText } from '../esc.ts';
import type { AgentEntry, PersonEntry } from '../feed/feed-core.ts';
import type { Chip } from '../events.ts';

/** What a chip shows: a card's number as its badge, or "Note"; and its label. */
export function chipParts(c: Chip): { badge: string; label: string; name: string } {
  return c.kind === 'card'
    ? { badge: String(c.ref), label: c.label, name: `Card ${c.ref}: ${c.label}` }
    : { badge: 'Note', label: c.label, name: `Note: ${c.label}` };
}

/** One chip's face; `remove` adds the composer's remove button. */
export function chipTemplate(c: Chip, remove = false): string {
  const p = chipParts(c);
  const x = remove
    ? `<button type="button" class="chat-chip-x" data-chip="${c.kind}-${c.ref}" aria-label="Remove ${esc(p.name)}">`
      + '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>'
    : '';
  return `<span class="chat-chip" data-kind="${c.kind}" title="${esc(p.name)}"><span class="chat-chip-n">${esc(p.badge)}</span>`
    + `<span class="chat-chip-t">${esc(p.label)}</span>${x}</span>`;
}

export function messageTemplate(m: PersonEntry | AgentEntry, render: RenderText): string {
  if (m.type === 'agent') return `<span class="chat-sr">Agent: </span><div class="chat-bubble">${render(m.text)}</div>`;
  const chips = m.chips.length
    ? `<ul class="chat-chips" aria-label="Sent with it">${m.chips.map((c) => `<li>${chipTemplate(c)}</li>`).join('')}</ul>`
    : '';
  return `<span class="chat-sr">You: </span><div class="chat-bubble"><p class="chat-own">${esc(m.text)}</p></div>${chips}`;
}
