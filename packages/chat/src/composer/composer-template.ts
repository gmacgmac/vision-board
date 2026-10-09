// Composer pattern, layer 2 (template): the chips row, the box (the text and Send), and the line
// under it. The box is drawn once, so typing survives; the chips and the line are redrawn alone.
import { esc } from '../esc.ts';
import type { Chip } from '../events.ts';
import { chipTemplate } from '../message/message-template.ts';
import type { ComposerView } from './composer-core.ts';

const SEND_ICON = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">'
  + '<path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function composerTemplate(label: string, maxLength: number): string {
  return '<div class="chat-cmp-chips" hidden></div>'
    + `<div class="chat-cmp-box"><textarea class="chat-cmp-text" rows="2" maxlength="${maxLength}" aria-label="${esc(label)}"></textarea>`
    + `<button type="button" class="chat-cmp-send" aria-label="Send">${SEND_ICON}</button></div>`
    + '<p class="chat-cmp-line"></p>';
}

export function chipsTemplate(chips: readonly Chip[]): string {
  if (!chips.length) return '';
  return `<span class="chat-cmp-label" aria-hidden="true">Attached</span><ul class="chat-chips" aria-label="Attached to the message">`
    + `${chips.map((c) => `<li>${chipTemplate(c, true)}</li>`).join('')}</ul>`;
}

/** The line under the box: the reason it is shut, or the hint with its keys drawn as keys. */
export function lineTemplate(v: ComposerView): string {
  if (v.shut) return esc(v.shut);
  return esc(v.hint).replace(/\b(Enter|Shift)\b/g, '<kbd>$1</kbd>');
}
