// A review button or its key on one card (split out of controller.ts in 3_FE_03): ✓ (Check), ✗
// (Cross), comment, save for later, reopen. Pressing the button that is lit clears it (`reopen`,
// answer-model ruling 8): the card is open again and the toast says "12 cleared"; ✗ while ✓ is lit
// switches straight to ✗. A second press of the same button on the same card within `REPEAT_MS` is
// ignored, so a double click never undoes itself. Comment on a card with a note not yet sent opens
// it to edit (2e_FE_01 ruling 1). Later and Reopen also move the card into the Later container and
// back out (3_FE_03 ruling 6, moves.ts). With "Hide answered" on, focus goes on to the next card
// when the card it was on is hidden by its answer.
import type { ActionId, ViewNode } from '#format';
import type { BoardState } from '#actions';
import { ACTIONS, DECIDED, statusOf } from '#actions';
import { isPressed, offers } from '#ui';
import type { ActFields } from './io.ts';
import type { Moves } from './moves.ts';
import type { NoteFlow } from './notes.ts';

export interface ItemActDeps {
  node(id: string): ViewNode | undefined;
  state(): BoardState;
  notes: Pick<NoteFlow, 'press'>;
  moves: Pick<Moves, 'status'>;
  record(fields: ActFields): Promise<boolean>;
  target(id: string): { n: number; ver: number | undefined };
  /** "Hide answered" is on. */
  hiding(): boolean;
  hidden(): Set<string>;
  neighbour(id: string, dir: 1 | -1): string | null;
  focusCard(id: string): void;
  toast(text: string): void;
  /** The clock, in ms (tests pass their own). */
  now?(): number;
}

/** How soon a second press of the same button on the same card counts as a double click. */
export const REPEAT_MS = 400;

/** The handler for one item action on card `id`. */
export function createItemActs(d: ItemActDeps): (id: string, requested: ActionId) => Promise<void> {
  const now = d.now ?? (() => Date.now());
  let last = { key: '', at: -Infinity };
  return async function act(id, requested) {
    const n = d.node(id);
    if (!n || n.n === undefined) return;
    // The keyboard can't send what the card doesn't offer (Reopen, O, is offered by a lit button).
    if (requested !== 'reopen' && !offers(n).includes(requested)) return;
    if (requested === 'comment') return d.notes.press(id, requested);
    const at = now(), key = `${id}:${requested}`;
    const repeat = key === last.key && at - last.at < REPEAT_MS;
    last = { key, at };
    if (repeat) return;
    const action: ActionId = isPressed(requested, statusOf(d.state(), id)) ? 'reopen' : requested;
    const def = ACTIONS[action];
    const next = d.hiding() && def.status && DECIDED.has(def.status) ? d.neighbour(id, 1) : null;
    const done = action === 'later' || action === 'reopen' ? d.moves.status(id, action) : d.record({ action, ...d.target(id) });
    if (!(await done)) return;
    d.focusCard(next && d.hidden().has(id) ? next : id);
    d.toast(`${n.n} ${action === 'reopen' ? 'cleared' : def.reply ?? def.label.toLowerCase()}`);
  };
}
