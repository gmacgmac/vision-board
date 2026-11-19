// Note bubble pattern, layer 2 (template): one pure function from a bubble's view to its markup.
// Tokens only and no inline styles (the page's CSP refuses them); placement and the card's colour
// are set by the element through the CSSOM. Mockup 05 section 1 `.ovl.note`: the card's number
// chip and a head line, the text, then the hint and the buttons on one row. Under the text, the
// agent's replies to the note, read-only (popovers-larger-thread ruling 2). Read-only (a sent note,
// or the conversation: every note and reply, review polish ruling 6) it has no bottom row: an × in
// the head's corner closes it (ruling 7).
import type { NoteEntry, NotesEntry, ReplyEntry } from '../node/node-core.ts';
import { isNoteEntry } from '../node/node-core.ts';
import { ACTION_ICON, svgIcon } from '../node/node-icons.ts';
import type { BubbleView } from './note-bubble-core.ts';
import { readOnlyMode } from './note-bubble-core.ts';
import { esc } from '../markdown/inline.ts';
import type { MarkdownOptions } from '../markdown/render.ts';
import { renderMarkdown } from '../markdown/render.ts';
import { MAX_TEXT } from '#format';
import * as noteBubbleWords from '../words/note-bubble.ts';
import * as uiCommonWords from '../words/ui-common.ts';
import * as nodeNotesWords from '../words/node-notes.ts';

export const button = (act: string, label: string, primary = false): string =>
  `<button type="button" class="vb-nb-btn${primary ? ' vb-nb-primary' : ''}" data-note-do="${act}">${esc(label)}</button>`;

/** The × in the head's top corner (ruling 7): the cross glyph the card's Cross wears, named "Close". */
export const closeX = (label: string): string =>
  `<button type="button" class="vb-nb-x" data-note-do="cancel" aria-label="${esc(label)}">${svgIcon(ACTION_ICON.drop!, 20, 'vb-nb-x-icon')}</button>`;

/** "Enter add · Esc cancel", with the keys drawn as keys. */
const hint = (text: string): string =>
  text ? `<span class="vb-nb-hint">${esc(text).replace(/\b(Enter|Esc)\b/g, '<kbd>$1</kbd>')}</span>` : '<span class="vb-nb-hint"></span>';

/** Who wrote a reply, on one line (points 618-619): "Agent · <name> <id>", the name alone cut with an ellipsis when the
 *  line is short (vb-note-bubble then gives it the whole name on hover); "Agent" with neither. */
const replyWho = (r: ReplyEntry): string => (r.name === undefined && r.id === undefined ? `<span class="vb-nb-who">${esc(r.who)}</span>`
  : `<span class="vb-nb-who vb-nb-agent"><span class="vb-nb-who-lead">${nodeNotesWords.agentLead}</span>`
    + `${r.name === undefined ? '' : `<span class="vb-nb-who-name">${esc(r.name)}</span>`}`
    + `${r.id === undefined ? '' : `<span class="vb-nb-who-id">${r.name === undefined ? '' : ' '}${esc(r.id)}</span>`}</span>`);

/** One reply as the card shows it: who over its words as Markdown (D-023). In the
 *  conversation each entry also carries its `seq` and takes focus from the page (`at`). */
const replyItem = (r: ReplyEntry, md: MarkdownOptions | undefined, at = '', cls = ''): string =>
  `<li class="vb-nb-reply${cls}"${at}${r.unseen ? ' data-unseen' : ''}>${replyWho(r)}<div class="vb-nb-reply-text">${renderMarkdown(r.text, md)}</div></li>`;

/** Where the page can scroll to and focus an entry of the conversation: by its ledger `seq`. */
const seqAt = (seq: number): string => ` data-seq="${seq}" tabindex="-1"`;

/** One of the person's notes in the conversation: "User" (its number in the hover, point 619), "Not sent" until an agent
 *  has had it, and its words; Edit while it can still be edited (not sent or answered, decision 8), which turns the
 *  window into the edit mode for it. In the conversation box (`box`) a note not sent is drawn dashed: it waits for the
 *  board's Send. */
function noteItem(e: NoteEntry, md?: MarkdownOptions, box?: boolean): string {
  const edit = e.sent ? ''
    : `<button type="button" class="vb-nb-btn vb-nb-edit" data-note-do="edit" data-edit="${e.seq}" aria-label="${noteBubbleWords.editNote(e.index)}">${uiCommonWords.edit}</button>`;
  const who = `${esc(e.who)}${e.sent ? '' : ` · <em>${noteBubbleWords.notSent}</em>`}`;
  return `<li class="vb-nb-note${box && !e.sent ? ' vb-nb-queued' : ''}"${seqAt(e.seq)}><div class="vb-nb-note-top">`
    + `<span class="vb-nb-who" title="${noteBubbleWords.noteNumber(e.index)}">${who}</span>${edit}</div><div class="vb-nb-note-text">${renderMarkdown(e.text, md)}</div></li>`;
}

/** Where an imported conversation ends (point 617): one divider after the last imported message, an entry of the list
 *  that reads "Imported" (a list holds only its entries, so no separator role). */
const importedEnd = `<li class="vb-nb-imported"><span>${noteBubbleWords.imported}</span></li>`;

/** The conversation as one list, in the order given: a note, its replies, an orphan reply; one "Imported" divider after
 *  the last message that came with an import. `box`: the conversation box, which marks the notes waiting for Send. */
export function conversationList(entries: readonly NotesEntry[], md?: MarkdownOptions, box?: boolean): string {
  const items = entries.flatMap((e) => (isNoteEntry(e)
    ? [{ html: noteItem(e, md, box), imported: e.imported }, ...(e.replies ?? []).map((r) => ({ html: replyItem(r, md, seqAt(r.seq)), imported: r.imported }))]
    : [{ html: replyItem(e, md, seqAt(e.seq), ' vb-nb-orphan'), imported: e.imported }]));
  const last = items.findLastIndex((x) => x.imported);
  return `<ol class="vb-nb-convo">${items.map((x, i) => x.html + (i === last ? importedEnd : '')).join('')}</ol>`;
}

/** The read-only part, which scrolls as one: the sent note (`read`), then the replies, oldest first;
 *  or the conversation. A tab stop, so the keyboard can scroll it; empty when there is nothing to show. */
function thread(v: BubbleView, read: string, md?: MarkdownOptions): string {
  const list = v.mode === 'thread' ? conversationList(v.entries, md)
    : v.replies.length ? `<ol class="vb-nb-replies">${v.replies.map((r) => replyItem(r, md)).join('')}</ol>` : '';
  if (!read && !list) return '';
  return `<div class="vb-nb-thread" role="group" aria-label="${esc(v.thread)}" tabindex="0">${read}${list}</div>`;
}

/** `number` draws the card's number chip; a note on a group of cards has none (its head names them).
 *  `md`: how its Markdown renders, as its board was told. */
export function noteBubbleTemplate(v: BubbleView, number?: number, md?: MarkdownOptions): string {
  const shown = readOnlyMode(v.mode);
  const chip = number === undefined ? '' : `<span class="vb-nb-num" aria-hidden="true">${number}</span>`;
  const head = `<div class="vb-nb-head">${chip}<span class="vb-nb-title">${esc(v.heading)}</span>${shown ? closeX(v.cancel) : ''}</div>`;
  // A sent note is history: it is shown, as Markdown (D-023), never edited. The conversation lists
  // every note and reply. Neither has a bottom row: the room goes to the list (ruling 7).
  if (shown) return `${head}${thread(v, v.mode === 'sent' ? `<div class="vb-nb-read">${renderMarkdown(v.text, md)}</div>` : '', md)}`;
  const body = `<textarea class="vb-nb-text" aria-label="${noteBubbleWords.noteText}" rows="3" maxlength="${MAX_TEXT}"`
    + ` placeholder="${esc(v.placeholder)}">${esc(v.text)}</textarea>${thread(v, '', md)}`;
  const row = `${v.remove ? button('remove', uiCommonWords.remove) : ''}${hint(v.hint)}${button('cancel', v.cancel)}`
    + `${v.primary ? button('save', v.primary, true) : ''}`;
  return `${head}${body}<p class="vb-nb-error" role="alert" hidden></p><div class="vb-nb-row">${row}</div>`;
}
