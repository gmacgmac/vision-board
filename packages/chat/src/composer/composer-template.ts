// Composer pattern, layer 2 (template): the chips row (the chips, then the host's context chip and,
// opened, the preview of its text over the composer), the box (the text and Send), and the line under it. The box is drawn once, so
// typing survives; the chips and the line are redrawn alone.
import { esc } from '../esc.ts';
import type { Chip } from '../events.ts';
import { chipTemplate } from '../message/message-template.ts';
import type { ComposerContext, ComposerView } from './composer-core.ts';
import { PREVIEW_LABEL } from './composer-core.ts';

const SEND_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">'
  + '<path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function composerTemplate(label: string, maxLength: number): string {
  return '<div class="chat-cmp-chips" hidden></div>'
    + `<div class="chat-cmp-box"><textarea class="chat-cmp-text" rows="2" maxlength="${maxLength}" aria-label="${esc(label)}"></textarea>`
    + `<button type="button" class="chat-cmp-send" aria-label="Send">${SEND_ICON}</button></div>`
    + '<p class="chat-cmp-line"></p>';
}

const OPEN_ICON = '<svg class="chat-cmp-ctx-mark" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">'
  + '<path d="M3 7.5 6 4.5l3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** The chips, each removable, then the host's context: a chip that opens (`open`) a preview of its
 *  text, which the region `id` holds. Empty when there is nothing attached. */
export function chipsTemplate(chips: readonly Chip[], context: ComposerContext | null = null, open = false, id = 'chat-cmp-ctx'): string {
  if (!chips.length && !context) return '';
  const items = chips.map((c) => `<li>${chipTemplate(c, true)}</li>`);
  if (context) items.push(`<li>${contextTemplate(context, open, id)}</li>`);
  const preview = context && open && context.text ? previewTemplate(context, id) : '';
  return `<span class="chat-cmp-label" aria-hidden="true">Attached</span><ul class="chat-chips" aria-label="Attached to the message">`
    + `${items.join('')}</ul>${preview}`;
}

/** The context chip: a button that opens and closes its preview; with no text, a plain chip. */
export function contextTemplate(c: ComposerContext, open: boolean, id: string): string {
  if (!c.text) return `<span class="chat-chip chat-cmp-ctx"><span class="chat-chip-t">${esc(c.label)}</span></span>`;
  return `<button type="button" class="chat-chip chat-cmp-ctx" aria-expanded="${open}"${open ? ` aria-controls="${esc(id)}"` : ''}>`
    + `<span class="chat-chip-t">${esc(c.label)}</span>${OPEN_ICON}</button>`;
}

/** The preview over the composer: exactly the text that goes, as it is; focusable, so a long one
 *  scrolls by keyboard. */
export const previewTemplate = (c: ComposerContext, id: string): string =>
  `<div class="chat-cmp-pop" id="${esc(id)}" role="region" aria-label="${PREVIEW_LABEL}" tabindex="0">`
  + `<p class="chat-cmp-pop-h" aria-hidden="true">${PREVIEW_LABEL}</p><pre class="chat-cmp-pop-text">${esc(c.text)}</pre></div>`;

/** The line under the box: the reason it is shut, or the hint with its keys drawn as keys. */
export function lineTemplate(v: ComposerView): string {
  if (v.shut) return esc(v.shut);
  return esc(v.hint).replace(/\b(Enter|Shift)\b/g, '<kbd>$1</kbd>');
}
