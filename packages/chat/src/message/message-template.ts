// Chat message pattern, layer 2 (template): one message's markup. The person's words exactly as
// typed (no Markdown: they are not read back as markup), with the chips they sent and the files they
// attached (a chip each, never a link: the board serves no attached file); the agent's words through
// the host's renderer (Markdown on the board). A hidden "You:" or "Agent:" leads each, so the log
// reads who said it.
import { esc } from '../esc.ts';
import type { RenderText } from '../esc.ts';
import type { AgentEntry, PersonEntry } from '../feed/feed-core.ts';
import type { AttachedFile, Chip } from '../events.ts';

/** What a chip shows: a card's number as its badge, or "Note"; and its label. */
export function chipParts(c: Chip): { badge: string; label: string; name: string } {
  return c.kind === 'card'
    ? { badge: String(c.ref), label: c.label, name: `Card ${c.ref}: ${c.label}` }
    : { badge: 'Note', label: c.label, name: `Note: ${c.label}` };
}

/** The remove button's mark, on every chip the composer shows. */
export const REMOVE_ICON = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

// Whole strings: a call or an interpolation here would count as running on import, and the bundler would keep
// this file, and the chat's elements with it, in the page's first chunk (the drawing loads when the panel opens).
const PICTURE_ICON = '<svg class="chat-chip-i" data-glyph="picture" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3" width="11" height="10" rx="1.5"/><circle cx="6" cy="6.5" r="1"/><path d="m3 12 3.5-3.5 2 2L11 8l2.5 2.5"/></svg>';
const DOCUMENT_ICON = '<svg class="chat-chip-i" data-glyph="document" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2.5h5L12.5 6v7.5H4zM9 2.5V6h3.5"/></svg>';
const PICTURE = /\.(?:png|jpe?g|gif|webp|avif|svg|bmp|tiff?|heic|heif|ico)$/i;

/** A file's mark, by its name's extension: a picture and a document differ by this alone. */
export const fileIcon = (name: string): string => (PICTURE.test(name) ? PICTURE_ICON : DOCUMENT_ICON);

/** A sent file's chip: the name the person's file has when the message carries it, else the saved one. */
export function fileChipTemplate(f: Pick<AttachedFile, 'name' | 'label'>): string {
  const shown = f.label ?? f.name;
  return `<span class="chat-chip" data-kind="file" title="${esc(shown)}">${fileIcon(shown)}<span class="chat-chip-t" dir="auto">${esc(shown)}</span></span>`;
}

/** One chip's face; `remove` adds the composer's remove button. */
export function chipTemplate(c: Chip, remove = false): string {
  const p = chipParts(c);
  const x = remove
    ? `<button type="button" class="chat-chip-x" data-chip="${c.kind}-${c.ref}" aria-label="Remove ${esc(p.name)}">${REMOVE_ICON}</button>`
    : '';
  return `<span class="chat-chip" data-kind="${c.kind}" title="${esc(p.name)}"><span class="chat-chip-n">${esc(p.badge)}</span>`
    + `<span class="chat-chip-t">${esc(p.label)}</span>${x}</span>`;
}

export function messageTemplate(m: PersonEntry | AgentEntry, render: RenderText): string {
  if (m.type === 'agent') return `<span class="chat-sr">Agent: </span><div class="chat-bubble">${render(m.text)}</div>`;
  const items = [...m.chips.map((c) => chipTemplate(c)), ...(m.files ?? []).map(fileChipTemplate)];
  const chips = items.length ? `<ul class="chat-chips" aria-label="Sent with it">${items.map((c) => `<li>${c}</li>`).join('')}</ul>` : '';
  return `<span class="chat-sr">You: </span><div class="chat-bubble"><p class="chat-own">${esc(m.text)}</p></div>${chips}`;
}
