// A review button or its key on one card (split out of controller.ts in 3_FE_03): acknowledge,
// drop, comment, more context, save for later, reopen. Pressing the button that matches the
// card's status undoes it (Reopen), unless the card has a note not yet sent: C and M then open it
// to edit (2e_FE_01 ruling 1). Later and Reopen also move the card into the Later container and
// back out (3_FE_03 ruling 6, moves.ts). With "Hide decided" on, focus goes on to the next card
// when the card it was on is hidden by its decision.
import type { ActionId, ViewNode } from '../../../../packages/format/src/index.ts';
import type { BoardState } from '../../../../packages/actions/src/index.ts';
import { ACTIONS, DECIDED, ITEM_ACTIONS, statusOf } from '../../../../packages/actions/src/index.ts';
import { isPressed, offers } from '../../../../packages/ui/src/index.ts';
import type { ActFields } from './io.ts';
import type { Moves } from './moves.ts';
import type { NoteFlow } from './notes.ts';
import { unsentNote } from './notes.ts';

export interface ItemActDeps {
  node(id: string): ViewNode | undefined;
  state(): BoardState;
  notes: Pick<NoteFlow, 'press'>;
  moves: Pick<Moves, 'status'>;
  record(fields: ActFields): Promise<boolean>;
  target(id: string): { n: number; ver: number | undefined };
  /** "Hide decided" is on. */
  hiding(): boolean;
  hidden(): Set<string>;
  neighbour(id: string, dir: 1 | -1): string | null;
  focusCard(id: string): void;
  toast(text: string): void;
}

/** The handler for one item action on card `id`. */
export function createItemActs(d: ItemActDeps): (id: string, requested: ActionId) => Promise<void> {
  return async function act(id, requested) {
    const n = d.node(id);
    if (!n || n.n === undefined) return;
    // The keyboard can't send what the card doesn't offer.
    if (ITEM_ACTIONS.includes(requested) && !offers(n).includes(requested)) return;
    const pressed = isPressed(requested, statusOf(d.state(), id));
    if ((requested === 'comment' || requested === 'context') && (!pressed || unsentNote(d.state(), id)))
      return d.notes.press(id, requested);
    const action: ActionId = pressed ? 'reopen' : requested;
    const def = ACTIONS[action];
    const next = d.hiding() && def.status && DECIDED.has(def.status) ? d.neighbour(id, 1) : null;
    const done = action === 'later' || action === 'reopen' ? d.moves.status(id, action) : d.record({ action, ...d.target(id) });
    if (!(await done)) return;
    d.focusCard(next && d.hidden().has(id) ? next : id);
    if (def.reply) d.toast(`${n.n} ${action === 'reopen' ? 'reopened' : def.reply}`);
  };
}
