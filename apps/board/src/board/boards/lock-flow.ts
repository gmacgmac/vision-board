// A locked board on the page (N40 rulings 1, 4, 5, api.md 138-140). The page reads the lock from the
// ledger it folds, through the action layer's one check (`boardLocked`; an archived board counts):
// after every batch and switch, `apply` puts `data-locked` on the world (styles/lock.css) and
// the status's `locked` (the toolbar's "Locked", Send paused, the "⋯" menu's Unlock board); the elements
// pause their own controls from `BoardState.locked` (packages/ui paused.ts). Nothing that changes
// the board goes while it is locked, and the person is told why ("Locked: unlock to change it"):
// the stage's handlers that act do nothing but say so (`guard`; the flag, the person's private mark,
// is not among them and stays usable), the note bubble doesn't open, and sender.ts asks `refuse`
// before every line it sends, so a path this file doesn't know is refused there too (the one funnel,
// with the same `passesLock` the server asks). Selection, zoom, pan and the finder stay. A ledger open read-only
// (D-085, `readOnly`) pauses the same controls with its own reason ("Read-only: press Edit to change it"); it is not
// a lock (no "Locked", no `data-locked`), and its refusals are the sender's (controller.ts), the flag's too.
import type { LedgerState } from '#actions';
import { boardLocked, LOCKED_PERSON, passesLock, READ_ONLY_PERSON } from '#actions';
import type { Outgoing } from '../sender.ts';
import type { StageHandlers } from '../input/index.ts';
import { ACTING } from './versions.ts';
import type { Status } from '../status.ts';

export interface LockDeps {
  world: HTMLElement;
  /** The ledger as folded now (never a past version's). */
  state(): LedgerState | null;
  /** The open board. */
  board(): string;
  /** Say why a press did nothing (the error toast). */
  say(reason: string): void;
  status: Status;
  /** The ledger is open read-only (D-085): the same controls pause, saying so. */
  readOnly?(): boolean;
}

export interface LockFlow {
  /** Why the open board can't change now (locked, or the ledger read-only), or null while it can. */
  paused(): string | null;
  /** Why `line` can't go to `board` now (it is locked and the line would change it), or null. */
  refuse(board: string, line: Outgoing): string | null;
  /** Show the open board's lock, after every batch and every switch. */
  apply(): void;
  /** The stage's handlers, those that change the board saying why and doing nothing while it is locked. */
  guard(h: StageHandlers): StageHandlers;
}

/** The handlers that change the board: the past view's (versions.ts) and the widths switch, but the
 * flag. Of these, the moves a drag makes after its start stay quiet: its start said why. */
const PAUSED = [...ACTING.filter((name) => name !== 'flag'), 'setWidths'] as const satisfies readonly (keyof StageHandlers)[];
const QUIET: ReadonlySet<keyof StageHandlers> = new Set(['frameMove', 'frameEnd', 'dragOver', 'drop']);

export function createLockFlow(d: LockDeps): LockFlow {
  const locked = (board: string) => {
    const s = d.state();
    return !!s && !!board && boardLocked(s, board);
  };
  const paused = () => (locked(d.board()) ? LOCKED_PERSON : d.readOnly?.() ? READ_ONLY_PERSON : null);

  return {
    paused,
    refuse: (board, line) => (locked(board) && !passesLock(line) ? LOCKED_PERSON : null),
    apply() {
      const on = locked(d.board());
      d.world.toggleAttribute('data-locked', on);
      d.status.set({ locked: on });
    },
    guard(h) {
      const out: StageHandlers = { ...h, carried: (id) => (paused() ? [] : h.carried(id)) };
      for (const name of PAUSED) {
        const fn = h[name] as ((...args: never[]) => void) | undefined;
        if (!fn) continue;
        Object.assign(out, {
          [name]: (...args: never[]) => {
            const why = paused();
            if (!why) return fn(...args);
            if (!QUIET.has(name)) d.say(why);
            return undefined;
          },
        });
      }
      return out;
    },
  };
}
