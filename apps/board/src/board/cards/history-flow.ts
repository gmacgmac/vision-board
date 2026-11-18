// A card's history box on the board (card-polish FE_03, maintainer point 20; D-099 1): the change badge, H or the
// right-click list opens it beside the node (mark-boxes.ts; Esc or a press outside closes it, focus goes back to the
// badge). Its rows are built as it shows (`POPOVER_SHOW`), from the per-card times the page's fold already keeps (packages/actions
// card-times.ts `cardTimeRows`): no ledger read, so no loading or error state. A row naming a note or
// an agent's reply closes the box and opens the node's conversation at it (notes.ts `show`). A line
// for the card that lands while the box is open adds its row at the top, focus left where it was.
// Up and Down (Home, End) move between the rows that are buttons (`menuKeydown`, `#ui`). Browser only.
import type { HistoryRow, LedgerState } from '#actions';
import { cardTimeRows } from '#actions';
import type { PopoverShowDetail } from '#ui';
import { HISTORY, historyMarkup, historyRowMarkup, menuKeydown, POPOVER_CLOSE, POPOVER_SHOW } from '#ui';
import { idOf } from '../card-numbers.ts';

export interface HistoryDeps {
  stage: HTMLElement;
  /** The state the board is drawn from: a past version's while one shows. */
  state(): LedgerState | null;
  board(): string;
  /** Open node `id`'s conversation at the note or reply `part` (notes.ts `show`). */
  show(id: string, part: number): void;
}

export interface HistoryFlow {
  /** Lines were applied: the open box, if any, gains the rows that are new since it was filled. */
  refresh(): void;
}

const ROW_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

/** The note or reply a row names (its seq), or undefined for a row that is text. */
function partOf(row: HTMLElement): number | undefined {
  const { historyNote: note, historyReply: reply } = row.dataset;
  const seq = reply ?? note;
  return seq === undefined ? undefined : Number(seq);
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
    if (!row || part === undefined || part === null) return;
    const card = row.closest<HTMLElement>('vb-node')!;
    // Closed (mark-acts.ts hears it on the stage, so it bubbles), the box gives focus back to the badge; the
    // conversation then takes it, at the note.
    card.dispatchEvent(new CustomEvent(POPOVER_CLOSE, { bubbles: true, detail: HISTORY }));
    d.show(card.dataset.id!, part);
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
