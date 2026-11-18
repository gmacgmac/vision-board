// Node pattern, the history box (card-polish FE_03; D-099 1): the box beside a node (node-box.css) that the change
// badge, H and right-click open (the page's cards/mark-boxes.ts), the stepper on top (planner's call 9). It lists when
// things happened to the card, newest first, one row each: the version, one line in the
// history model's words (packages/actions card-history.ts `HistoryRow`), then the agent's label on an agent's row and
// the time (`noteTime`, the whole date as its `title`). No note or reply text and no private mark ever reaches it: the rows carry none. A row
// that names a note still on the card, or an agent's reply, is a button (`data-history-note`,
// `data-history-reply`): the page closes the box and rings that note on the card. Other rows are text.
// The template draws the empty box with its heading; the page fills the list when the box shows (`POPOVER_SHOW`),
// from the state it holds. Pure.
import type { ViewNode } from '#format';
import type { HistoryRow } from '#actions';
import { esc } from '../markdown/inline.ts';
import { ACTION_ICON, svgIcon } from './node-icons.ts';
import { isItem } from './node-core.ts';
import { fullTime, noteTime } from './node-time.ts';
import * as nodeWords from '../words/node.ts';

/** The box's name (`data-pop`). */
export const HISTORY = 'history';

/** What the box says while a card has no row (in practice a card always has its first drawing). */
export const HISTORY_EMPTY = nodeWords.nothingHasHappenedToThis;

/** The box's heading on a node with no number, "Card 4 history" on one with. */
export const historyHead = (n: ViewNode): string => (isItem(n) ? nodeWords.cardHistory(n.n) : nodeWords.history(n.title));

/** The box beside a node (node-box.css: "History of 28" and an ×, the stepper, the list), empty but for its heading;
 * `historyMarkup` fills `.vb-history-body` when it shows. It scrolls when long, so it is a tab stop (WCAG 2.1.1).
 * `top`: markup between the heading and the list, the node's step section and stepper (planner's call 9). */
export function historyBox(n: ViewNode, id: string, top: string): string {
  const head = isItem(n) ? nodeWords.historyOfN(n.n) : historyHead(n);
  const close = `<button type="button" class="vb-node-box-x" data-box-close aria-label="${nodeWords.closeHistory}">${svgIcon(ACTION_ICON.drop!, 20, 'vb-node-box-x-icon')}</button>`;
  return `<div class="vb-tip vb-card-pop vb-node-box" data-pop="${HISTORY}" id="${esc(id)}" role="dialog" tabindex="0" aria-label="${esc(head)}">`
    + `<div class="vb-node-box-head"><span class="vb-node-box-title">${esc(head)}</span>${close}</div>`
    + `<div class="vb-node-box-step">${top}</div><div class="vb-history-body vb-node-box-body"></div></div>`;
}

/** One row, as the mock-up draws it: the version it drew (↩ for a proposal withdrawn), then its words on one line where
 *  they fit, over who and when; a button when it names a note on the card or is an agent's reply, else text. */
export function historyRowMarkup(r: HistoryRow, now: Date): string {
  const time = `<time class="vb-history-time" datetime="${esc(r.at)}" title="${esc(fullTime(r.at))}">${esc(noteTime(r.at, now))}</time>`;
  const link = r.reply !== undefined ? ` data-history-reply="${r.reply}"` : r.note !== undefined ? ` data-history-note="${r.note}"` : '';
  const ver = r.ver !== undefined ? `v${r.ver}` : r.kind === 'proposal-withdrawn' ? '↩' : '';
  const meta = `<span class="vb-history-meta">${r.agent ? `<span class="vb-history-agent">${esc(r.agent)} · </span>` : ''}${time}</span>`;
  const inner = `<b class="vb-history-ver" aria-hidden="true">${ver}</b><span class="vb-history-words">${esc(r.words)}</span>${meta}`;
  const row = link ? `<button type="button" class="vb-history-row"${link}>${inner}</button>` : `<div class="vb-history-row">${inner}</div>`;
  return `<li data-seq="${r.seq}">${row}</li>`;
}

/** The box's list, newest first, or the empty line. `now` decides "Today" and "Yesterday". */
export const historyMarkup = (rows: readonly HistoryRow[], now: Date): string =>
  (rows.length === 0 ? `<p class="vb-history-empty">${HISTORY_EMPTY}</p>`
    : `<ol class="vb-history-list">${rows.map((r) => historyRowMarkup(r, now)).join('')}</ol>`);
