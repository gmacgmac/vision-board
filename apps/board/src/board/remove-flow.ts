// The person removes cards and containers on the page (N24 rulings 1-5, api.md 141; personRemove
// flag): Remove card on a selection (the selection bar's button, Delete or Backspace) and Remove
// container in a container's settings. Each asks first in the confirm dialog (rule 8), with the words
// of remove-words.ts, then sends the person's `retire` line through the one sender (sender.ts), which
// refuses it while a past version shows or the board is locked. The cards leave the selection on the
// redraw (controller.ts `selection.keep`); focus that was on what left goes back to the board.
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import type { ConfirmList } from '../shell/shell.svelte.ts';
import type { RetireFields } from './io.ts';
import type { RemoveWords } from './remove-words.ts';
import { cardsWords, containerWords } from './remove-words.ts';

export interface RemoveDeps {
  stage: HTMLElement;
  /** The ledger as folded now (never a past version's). */
  state(): LedgerState | null;
  board(): string;
  /** A container's title on the open board. */
  title(region: string): string;
  /** Send the person's retire line and draw it; null when recorded (sender.ts `retire`). */
  retire(fields: RetireFields): Promise<string | null>;
  confirm(heading: string, body: string, confirm: string, list?: ConfirmList): Promise<boolean>;
  toast(text: string): void;
}

export interface RemoveFlow {
  /** Remove card: the cards `ids` (the page's ids, their board numbers); false when there are none. */
  cards(ids: readonly string[]): boolean;
  /** Remove container `region` and every card in it now. */
  container(region: string): void;
}

export function createRemoveFlow(d: RemoveDeps): RemoveFlow {
  /** Ask with `words`, then send `fields`; on success say what went and keep focus on the board. */
  async function ask(words: RemoveWords, fields: RetireFields) {
    if (!(await d.confirm(words.heading, words.body, words.confirm, words.list))) return;
    if ((await d.retire(fields)) !== null) return;
    d.toast(words.done);
    const at = document.activeElement;
    if (!at || at === document.body || !at.isConnected) d.stage.focus({ preventScroll: true });
  }

  return {
    cards(ids) {
      const s = d.state();
      const numbers = ids.map(Number).filter((n) => Number.isInteger(n));
      if (!s || numbers.length === 0) return false;
      void ask(cardsWords(s, d.board(), numbers), { cards: [...numbers].sort((a, b) => a - b) });
      return true;
    },
    container(region) {
      const s = d.state();
      if (s) void ask(containerWords(s, d.board(), region, d.title(region)), { region });
    },
  };
}
