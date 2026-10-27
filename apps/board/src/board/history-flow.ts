// A card's history box on the board (card-polish FE_03, maintainer point 20): the ⓘ at the far right
// of a card's footer opens it (the card popover, node-popover.ts: hover or focus shows it, a click or
// Enter opens it, Esc or a press outside closes it, focus goes back to the ⓘ). Its rows are built as
// it shows (`POPOVER_SHOW`), from the per-card times the page's fold already keeps (packages/actions
// card-times.ts `cardTimeRows`): no ledger read, so no loading or error state. A row naming a note or
// an agent's reply closes the box and rings that note on the card (note-hide.ts `highlight`). A line
// for the card that lands while the box is open adds its row at the top, focus left where it was.
// Up and Down (Home, End) move between the rows that are buttons (menu-keys.ts). Browser only.
import type { HistoryRow, LedgerState } from '#actions';
import { cardTimeRows } from '#actions';
import type { PopoverShowDetail } from '#ui';
import { HISTORY, historyMarkup, historyRowMarkup, POPOVER_CLOSE, POPOVER_SHOW } from '#ui';
import { idOf } from './card-numbers.ts';
import { menuKeydown } from './menu-keys.ts';
import type { NotePart } from './note-hide.ts';

export interface HistoryDeps {
  stage: HTMLElement;
  /** The state the board is drawn from: a past version's while one shows. */
  state(): LedgerState | null;
  board(): string;
  highlight(id: string, part: NotePart): Promise<boolean>;
}

export interface HistoryFlow {
  /** Lines were applied: the open box, if any, gains the rows that are new since it was filled. */
  refresh(): void;
}

const ROW_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

/** The note or reply a row names, or undefined for a row that is text. */
function partOf(row: HTMLElement): NotePart | undefined {
  const { historyNote: note, historyReply: reply } = row.dataset;
  return reply !== undefined ? { reply: Number(reply) } : note !== undefined ? { note: Number(note) } : undefined;
}

export function createHistoryFlow(d: HistoryDeps): HistoryFlow {
  /** The box showing, the card it is on (board number) and the newest row it holds. */
  let shown: { id: string; box: HTMLElement; top: number } | null = null;

  /** Card `id`'s rows, newest first, from the held state. */
  function rowsOf(id: string): HistoryRow[] {
    const s = d.state();
    const card = s ? idOf(s, d.board(), Number(id)) : undefined;
    return s && card !== undefined ? cardTimeRows(s, card) : [];
  }

  function fill(id: string, box: HTMLElement) {
    const rows = rowsOf(id);
    // Markup from historyMarkup, which escapes every text run.
    box.querySelector('.vb-history-body')!.innerHTML = historyMarkup(rows, new Date());
    shown = { id, box, top: rows[0]?.seq ?? 0 };
  }

  d.stage.addEventListener(POPOVER_SHOW, (e) => {
    const { name, box } = (e as CustomEvent<PopoverShowDetail>).detail;
    if (name === HISTORY) fill((e.target as HTMLElement).dataset.id!, box);
  });

  d.stage.addEventListener('click', (e) => {
    const row = (e.target as Element).closest<HTMLElement>('vb-node .vb-card-pop button.vb-history-row');
    const part = row && partOf(row);
    if (!row || !part) return;
    const card = row.closest<HTMLElement>('vb-node')!;
    // Closed, the box gives focus back to the ⓘ; the highlight then moves it on to the note.
    card.dispatchEvent(new CustomEvent(POPOVER_CLOSE, { detail: HISTORY }));
    void d.highlight(card.dataset.id!, part);
  });

  d.stage.addEventListener('keydown', (e) => {
    const box = (e.target as Element).closest?.<HTMLElement>(`.vb-card-pop[data-pop="${HISTORY}"]`);
    const rows = box ? [...box.querySelectorAll<HTMLElement>('button.vb-history-row')] : [];
    // With no row to move to, the keys scroll the box.
    if (rows.length > 0 && ROW_KEYS.has(e.key)) menuKeydown(e, rows, () => {});
  });

  return {
    refresh() {
      if (!shown?.box.isConnected || !shown.box.hasAttribute('data-open')) {
        shown = null;
        return;
      }
      const fresh = rowsOf(shown.id).filter((r) => r.seq > shown!.top);
      if (fresh.length === 0) return;
      const list = shown.box.querySelector('.vb-history-list');
      if (!list) return fill(shown.id, shown.box);
      list.insertAdjacentHTML('afterbegin', fresh.map((r) => historyRowMarkup(r, new Date())).join(''));
      shown.top = fresh[0]!.seq;
    },
  };
}
