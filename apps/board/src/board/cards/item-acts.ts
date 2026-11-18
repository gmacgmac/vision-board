// A review button or its key on one card (split out of controller.ts in 3_FE_03): ✓ (Check), ✗
// (Cross), comment, save for later, reopen. Pressing the button that is lit clears it (`reopen`,
// answer-model ruling 8): the card is open again and the toast says "12 cleared"; ✗ while ✓ is lit
// switches straight to ✗. A second press of the same button on the same card within `REPEAT_MS` is
// ignored, so a double click never undoes itself. Comment on a card with a note not yet sent opens
// it to edit (2e_FE_01 ruling 1). Later and Reopen also move the card into the Later container and
// back out (3_FE_03 ruling 6, moves.ts). With "Hide answered" on, focus goes on to the next card
// when the card it was on is hidden by its answer. The write is slower than the keyboard: focus goes back
// to the card only if it is still there or lost to the redraw, never from where the person moved it on.
// A press acts on the answer the person meant (FIX_03): while a card's write is on its way, the next press reads the
// status that write leaves, not the one drawn before it, and is sent after it, so a clear and a Tick a moment later
// tick the card instead of clearing it twice.
import type { ActionId, ViewNode } from '#format';
import type { BoardState, ItemStatus } from '#actions';
import { ACTIONS, DECIDED, statusOf } from '#actions';
import { isPressed, offers } from '#ui';
import type { ActFields } from '../io.ts';
import type { Moves } from '../selection/index.ts';
import type { NoteFlow } from '../notes/index.ts';

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
  /** The focusLeads flag: the keyboard focus is now somewhere other than card `id` and not lost, so a
   *  finished press must not take it back (KEY_01). Absent with the flag off: focus always returns. */
  focusLeft?(id: string): boolean;
  toast(text: string): void;
  /** The clock, in ms (tests pass their own). */
  now?(): number;
}

/** How soon a second press of the same button on the same card counts as a double click. */
export const REPEAT_MS = 400;

/** The handler for one item action on card `id`: true once written, false when the write failed, undefined when
 *  nothing was sent (a card or action it doesn't take, a second press within `REPEAT_MS`, a note to write). */
export function createItemActs(d: ItemActDeps): (id: string, requested: ActionId) => Promise<boolean | undefined> {
  const now = d.now ?? (() => Date.now());
  let last = { key: '', at: -Infinity };
  /** Per card, the status its writes on their way leave it with and the last of them, until that one lands. */
  const ahead = new Map<string, { status: ItemStatus; done: Promise<unknown> }>();
  return async function act(id, requested) {
    const n = d.node(id);
    if (!n || n.n === undefined) return;
    // The keyboard can't send what the card doesn't offer (Reopen, O, is offered by a lit button).
    if (requested !== 'reopen' && !offers(n).includes(requested)) return;
    if (requested === 'comment') return void d.notes.press(id, requested);
    const at = now(), key = `${id}:${requested}`;
    const repeat = key === last.key && at - last.at < REPEAT_MS;
    last = { key, at };
    if (repeat) return;
    const before = ahead.get(id);
    const action: ActionId = isPressed(requested, before?.status ?? statusOf(d.state(), id)) ? 'reopen' : requested;
    const def = ACTIONS[action];
    const next = d.hiding() && def.status && DECIDED.has(def.status) ? d.neighbour(id, 1) : null;
    const send = () => (action === 'later' || action === 'reopen' ? d.moves.status(id, action) : d.record({ action, ...d.target(id) }));
    const done = before ? before.done.then(send, send) : send();
    if (def.status) ahead.set(id, { status: def.status, done });
    const ok = await done.finally(() => { if (ahead.get(id)?.done === done) ahead.delete(id); });
    if (!ok) return false;
    if (!d.focusLeft?.(id)) d.focusCard(next && d.hidden().has(id) ? next : id);
    d.toast(`${n.n} ${action === 'reopen' ? 'cleared' : def.reply ?? def.label.toLowerCase()}`);
    return true;
  };
}
