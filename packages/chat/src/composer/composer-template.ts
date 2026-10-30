// Composer pattern, layer 2 (template): the chips row (the chips, then the host's context chip and,
// opened, the preview of its text over the composer), the box (the text and Send), and the line under it. The box is drawn once, so
// typing survives; the chips and the line are redrawn alone. With the host's words for attaching: the
// paperclip, its file input, the drop hint and the status line a screen reader follows, and a chip per file.
import { esc } from '../esc.ts';
import type { Chip } from '../events.ts';
import { chipTemplate, fileIcon, REMOVE_ICON } from '../message/message-template.ts';
import type { ComposerContext, ComposerFile, ComposerFileWords, ComposerView } from './composer-core.ts';
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

const PAPERCLIP = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M13.2 7.4 8 12.6a3 3 0 0 1-4.3-4.2l5.5-5.5a2 2 0 0 1 2.8 2.8l-5.4 5.4a1 1 0 0 1-1.4-1.4l4.8-4.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const SPINNER = '<svg class="chat-chip-i chat-cmp-spin" data-glyph="uploading" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="24 11"/></svg>';
const REFUSED_ICON = '<svg class="chat-chip-i" data-glyph="refused" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.5 14 13H2zM8 6.5v3M8 11.3v.1"/></svg>';

/** The paperclip and the native file input behind it, set in the box before Send. */
export const attachTemplate = (w: ComposerFileWords): string =>
  `<button type="button" class="chat-cmp-attach" aria-label="${esc(w.attach)}" title="${esc(w.tip)}">${PAPERCLIP}</button>`
  + '<input type="file" class="chat-cmp-input" multiple hidden>';

/** The hint over the box while a file is dragged over the composer. */
export const dropTemplate = (w: ComposerFileWords): string => `<p class="chat-cmp-drop">${esc(w.drop)}</p>`;

/** The status line a screen reader follows: each file's state as it moves. */
export const saidTemplate = (): string => '<p class="chat-sr chat-cmp-said" role="status"></p>';

/** One file's chip: what state it is in, in words as well as by its mark; refused, why, in full. */
export function fileTemplate(f: ComposerFile, w: ComposerFileWords): string {
  const icon = f.state === 'uploading' ? SPINNER : f.state === 'refused' ? REFUSED_ICON : fileIcon(f.name);
  const status = f.state === 'uploading' ? `<span class="chat-chip-s">${esc(w.uploading)}</span>`
    : f.state === 'ready' ? `<span class="chat-sr">${esc(w.ready)}</span>` : '';
  const why = f.state === 'refused' ? `<span class="chat-chip-why">${esc(f.reason ?? '')}</span>` : '';
  return `<span class="chat-chip" data-kind="file" data-state="${f.state}" title="${esc(f.name)}">${icon}<span class="chat-chip-t" dir="auto">${esc(f.name)}</span>${status}`
    + `<button type="button" class="chat-chip-x" data-file="${esc(f.id)}" aria-label="${esc(w.remove(f.name))}">${REMOVE_ICON}</button>${why}</span>`;
}

/** The chips, each removable, the files (with the host's words), then the host's context: a chip that
 *  opens (`open`) a preview of its text, which the region `id` holds. Empty when there is nothing attached. */
export function chipsTemplate(
  chips: readonly Chip[], context: ComposerContext | null = null, open = false, id = 'chat-cmp-ctx',
  files: readonly ComposerFile[] = [], words?: ComposerFileWords,
): string {
  const shown = words ? files : [];
  if (!chips.length && !context && !shown.length) return '';
  const items = chips.map((c) => `<li>${chipTemplate(c, true)}</li>`);
  items.push(...shown.map((f) => `<li>${fileTemplate(f, words!)}</li>`));
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
