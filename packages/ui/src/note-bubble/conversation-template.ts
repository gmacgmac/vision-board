// Note bubble pattern, the conversation box's markup (nodeEdges, D-099 3, FE_03; design/mockups/node-states/
// default-input-*): a compact head (the node's number, its title, ×), tabs only when the node is in a note on several
// nodes (this node, then each such note), the thread oldest first with a note waiting for Send marked and "Waiting for
// the agent" under a note sent and not yet answered, then the reply field and two buttons sharing the width, Ask now
// and Add note, their keys in their tooltips. Loaded on first use (`loadConversation`), out of the page's start weight.
import type { MarkdownOptions } from '../markdown/render.ts';
import { esc } from '../markdown/inline.ts';
import { MAX_TEXT } from '#format';
import type { BoxView, BubbleView } from './note-bubble-core.ts';
import { ACTION_ICON, svgIcon } from '../node/node-icons.ts';
import { button, conversationList } from './note-bubble-template.ts';
import * as noteBubbleWords from '../words/note-bubble.ts';

const tabs = (b: BoxView): string => (b.tabs.length < 2 ? ''
  : `<div class="vb-nb-tabs" role="tablist" aria-label="${noteBubbleWords.conversations}">${b.tabs.map((t) =>
    `<button type="button" role="tab" class="vb-nb-tab" data-note-do="tab" data-tab="${esc(t.key)}" aria-selected="${t.on === true}">${esc(t.label)}</button>`).join('')}</div>`);

/** The thread, a tab stop that scrolls as one; nothing when the node has no notes yet (only the field shows). */
function thread(v: BubbleView, b: BoxView, md?: MarkdownOptions): string {
  const wait = b.waiting ? `<p class="vb-nb-wait" role="status">${esc(b.waiting)}</p>` : '';
  if (!v.entries.length && !wait) return '';
  return `<div class="vb-nb-thread" role="group" aria-label="${esc(v.thread)}" tabindex="0">${conversationList(v.entries, md, b.queued)}${wait}</div>`;
}

/** Ask now: disabled (still focusable, so its tooltip, the reason, can be read) while no message can go. */
const ask = (b: BoxView): string =>
  `<button type="button" class="vb-nb-btn vb-nb-ask" data-note-do="ask" title="${esc(b.askTip)}"${b.blocked ? ' aria-disabled="true"' : ''}>${esc(b.ask)}</button>`;

export function conversationTemplate(v: BubbleView, number?: number, md?: MarkdownOptions): string {
  const b = v.box!;
  const chip = number === undefined ? '' : `<span class="vb-nb-num" aria-hidden="true">${number}</span>`;
  // The box beside a node's head (node-box.css), as the history box's: the number, the title, the ×.
  const x = `<button type="button" class="vb-node-box-x" data-note-do="cancel" aria-label="${esc(v.cancel)}">${svgIcon(ACTION_ICON.drop!, 20, 'vb-node-box-x-icon')}</button>`;
  const head = `<div class="vb-node-box-head">${chip}<span class="vb-node-box-title">${esc(b.title)}</span>${x}</div>`;
  const field = `<textarea class="vb-nb-text" aria-label="${esc(v.placeholder)}" rows="1" maxlength="${MAX_TEXT}" placeholder="${esc(v.placeholder)}">${esc(v.text)}</textarea>`;
  const add = button('save', v.primary!, true).replace('<button ', `<button title="${esc(b.addTip)}" `);
  return `${head}${tabs(b)}<div class="vb-node-box-body">${thread(v, b, md)}${field}<p class="vb-nb-error" role="alert" hidden></p>`
    + `<div class="vb-nb-row vb-nb-pair">${ask(b)}${add}</div></div>`;
}
