// Node pattern, the history box (card-polish FE_03): the card popover's third box (node-popover.ts),
// opened from the ⓘ at the far right of the card's footer. It lists when things happened to the card,
// newest first, one row each: the time (`noteTime`, the whole date as its `title`) and one line in the
// history model's words (packages/actions card-history.ts `HistoryRow`), with the agent's label on an
// agent's row. No note or reply text and no private mark ever reaches it: the rows carry none. A row
// that names a note still on the card, or an agent's reply, is a button (`data-history-note`,
// `data-history-reply`): the page closes the box and rings that note on the card. Other rows are text.
// The template draws the ⓘ and the empty box with its heading; the page fills the list when the box
// shows (`POPOVER_SHOW`), from the state it holds. Pure.
import type { ViewNode } from '#format';
import type { HistoryRow } from '#actions';
import { esc } from '../markdown/inline.ts';
import { INFO_ICON, svgIcon } from './node-icons.ts';
import { isItem } from './node-core.ts';
import { fullTime, noteTime } from './node-time.ts';

/** The box's name in the card popover (`data-pop`), and the ⓘ that opens it. */
export const HISTORY = 'history';
export const HISTORY_TAB = 'button.vb-history';

/** What the box says while a card has no row (in practice a card always has its first drawing). */
export const HISTORY_EMPTY = 'Nothing has happened to this card yet';

const cardName = (n: ViewNode): string => (isItem(n) ? `card ${n.n}` : `card: ${n.title}`);

/** The ⓘ's name, "History of card 4", and the box's heading, "Card 4 history". */
export const historyLabel = (n: ViewNode): string => `History of ${cardName(n)}`;
export const historyHead = (n: ViewNode): string => (isItem(n) ? `Card ${n.n} history` : `${n.title}: history`);

/** The ⓘ: 24px like the flag, a button that opens the box (a dialog) beside the card. */
export const historyButton = (n: ViewNode, box: string): string =>
  `<button type="button" class="vb-act vb-history" aria-haspopup="dialog" aria-expanded="false" aria-controls="${esc(box)}"`
  + ` aria-label="${esc(historyLabel(n))}" title="History">${svgIcon(INFO_ICON, 20, 'vb-act-icon')}</button>`;

/** The box, empty but for its heading; `historyMarkup` fills `.vb-history-body` when it shows. It
 * scrolls when long, so it is a tab stop (WCAG 2.1.1), as the handover box is. */
export const historyBox = (n: ViewNode, id: string): string =>
  `<div class="vb-tip vb-card-pop" data-pop="${HISTORY}" id="${esc(id)}" role="dialog" tabindex="0" aria-label="${esc(historyHead(n))}">`
  + `<h4 class="vb-prop-head vb-history-head">${esc(historyHead(n))}</h4><div class="vb-history-body"></div></div>`;

/** One row: a button when it names a note on the card or is an agent's reply, else text. */
export function historyRowMarkup(r: HistoryRow, now: Date): string {
  const time = `<time class="vb-history-time" datetime="${esc(r.at)}" title="${esc(fullTime(r.at))}">${esc(noteTime(r.at, now))}</time>`;
  const words = `<span class="vb-history-words">${esc(r.words)}${r.agent ? `<span class="vb-history-agent"> · ${esc(r.agent)}</span>` : ''}</span>`;
  const link = r.reply !== undefined ? ` data-history-reply="${r.reply}"` : r.note !== undefined ? ` data-history-note="${r.note}"` : '';
  const row = link ? `<button type="button" class="vb-history-row"${link}>${time}${words}</button>` : `<div class="vb-history-row">${time}${words}</div>`;
  return `<li data-seq="${r.seq}">${row}</li>`;
}

/** The box's list, newest first, or the empty line. `now` decides "Today" and "Yesterday". */
export const historyMarkup = (rows: readonly HistoryRow[], now: Date): string =>
  (rows.length === 0 ? `<p class="vb-history-empty">${HISTORY_EMPTY}</p>`
    : `<ol class="vb-history-list">${rows.map((r) => historyRowMarkup(r, now)).join('')}</ol>`);
