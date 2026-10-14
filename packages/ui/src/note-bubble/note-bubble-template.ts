// Note bubble pattern, layer 2 (template): one pure function from a bubble's view to its markup.
// Tokens only and no inline styles (the page's CSP refuses them); placement and the card's colour
// are set by the element through the CSSOM. Mockup 05 section 1 `.ovl.note`: the card's number
// chip and a head line, the text, then the hint and the buttons on one row. Under the text, the
// agent's replies to the note, read-only (popovers-larger-thread ruling 2): the exchange.
import type { ReplyEntry } from '../node/node-core.ts';
import type { BubbleView } from './note-bubble-core.ts';
import { esc } from '../markdown/inline.ts';
import { renderMarkdown } from '../markdown/render.ts';
import { MAX_TEXT } from '../../../format/src/index.ts';

const button = (act: string, label: string, primary = false): string =>
  `<button type="button" class="vb-nb-btn${primary ? ' vb-nb-primary' : ''}" data-note-do="${act}">${esc(label)}</button>`;

/** "Enter add · Esc cancel", with the keys drawn as keys. */
const hint = (text: string): string =>
  text ? `<span class="vb-nb-hint">${esc(text).replace(/\b(Enter|Esc)\b/g, '<kbd>$1</kbd>')}</span>` : '<span class="vb-nb-hint"></span>';

/** One reply as the card shows it: "Agent reply · label" over its words as Markdown (D-023). */
const replyItem = (r: ReplyEntry): string =>
  `<li class="vb-nb-reply"><span class="vb-nb-who">${esc(r.who)}</span><div class="vb-nb-reply-text">${renderMarkdown(r.text)}</div></li>`;

/** The read-only part, which scrolls as one: the sent note (`read`), then the replies, oldest first.
 *  A tab stop, so the keyboard can scroll it; empty when there is nothing to show. */
function thread(v: BubbleView, read: string): string {
  const list = v.replies.length ? `<ol class="vb-nb-replies">${v.replies.map(replyItem).join('')}</ol>` : '';
  if (!read && !list) return '';
  return `<div class="vb-nb-thread" role="group" aria-label="${esc(v.thread)}" tabindex="0">${read}${list}</div>`;
}

/** `number` draws the card's number chip; a note on a group of cards has none (its head names them). */
export function noteBubbleTemplate(v: BubbleView, number?: number): string {
  const chip = number === undefined ? '' : `<span class="vb-nb-num" aria-hidden="true">${number}</span>`;
  const head = `<div class="vb-nb-head">${chip}<span class="vb-nb-title">${esc(v.heading)}</span></div>`;
  // A sent note is history: it is shown, as Markdown (D-023), never edited. A reply on its own
  // has no note: only the reply shows.
  const body = v.mode === 'sent' ? thread(v, `<div class="vb-nb-read">${renderMarkdown(v.text)}</div>`)
    : v.mode === 'reply' ? thread(v, '')
      : `<textarea class="vb-nb-text" aria-label="Note text" rows="3" maxlength="${MAX_TEXT}"`
        + ` placeholder="${esc(v.placeholder)}">${esc(v.text)}</textarea>${thread(v, '')}`;
  const row = `${v.remove ? button('remove', 'Remove') : ''}${hint(v.hint)}${button('cancel', v.cancel)}`
    + `${v.primary ? button('save', v.primary, true) : ''}`;
  return `${head}${body}<p class="vb-nb-error" role="alert" hidden></p><div class="vb-nb-row">${row}</div>`;
}
