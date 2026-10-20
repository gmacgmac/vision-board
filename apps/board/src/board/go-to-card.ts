// Go to a card by typing its number (cortex-tasks/board/2026-10-15_board-app_go-to-card-number.md,
// goToCard flag). A digit typed on the board, outside a text field, opens the "Go to card" box
// (shell/GoToCard.svelte) holding it (the `go-to-card` command, commands.ts, keys.ts); Enter goes,
// Backspace edits, Esc closes. Nothing goes by itself; with the goAfterPause flag (off) a pause of
// GO_PAUSE after the last digit goes (ruling 2). Going selects and focuses the card; the board
// pans only by `revealPan`'s rule (the controller's `arrive`, ruling 3). A number the board never
// gave says "No card 99"; a retired card says it was removed and offers the version where it last
// appeared, as the container's retired marker does (`lastShown`, ruling 4). Card numbers go
// through card-numbers.ts. `goTarget` is pure; `createGoTo` keeps the box's state and its timer. The
// toolbar's open list goes to a card through the same path (`to`, open-list FE_01).
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { idOf } from './card-numbers.ts';
import { lastShown } from './retired.ts';

/** The most digits the box holds. */
export const GO_DIGITS = 6;
/** The pause after the last digit that goes by itself, with the goAfterPause flag (ruling 2). */
export const GO_PAUSE = 1000;

/** What a number names on the board: a card drawn with it, nothing, a card on the board but not
 *  drawn (hidden with the answered cards), or a retired card with the version that last showed it. */
export type GoTarget =
  | { to: 'card'; id: string }
  | { to: 'none' }
  | { to: 'hidden' }
  | { to: 'retired'; version?: number; until?: number };

/** The box as the page shows it: the digits, what the last go found when it did not arrive, and a
 *  retired card's version to open (`label` is the button's accessible name). */
export interface GoBox {
  text: string;
  said?: string;
  past?: { version: number; until?: number; label: string };
}

/** The digits of what was typed, at most GO_DIGITS. */
export const goDigits = (text: string): string => text.replace(/\D/g, '').slice(0, GO_DIGITS);

/** Card `n` on `board` in state `s` (none before the ledger is read). `drawn`: whether the layout drew a card id (the View's ids are
 *  board numbers). `versions`: past versions can show (the versionView flag). */
export function goTarget(s: LedgerState | null, board: string, n: number, drawn: (id: string) => boolean, versions = true): GoTarget {
  const id = String(n);
  if (drawn(id)) return { to: 'card', id };
  if (!s) return { to: 'none' };
  const x = idOf(s, board, n);
  const card = x === undefined ? undefined : s.nodes.get(x);
  if (!card) return { to: 'none' };
  if (card.retired === undefined) return { to: 'hidden' };
  return { to: 'retired', ...(versions && lastShown(s, board, card.retired)) };
}

/** What the box says for a go that did not arrive. */
const SAYS: Record<Exclude<GoTarget['to'], 'card'>, (n: number) => string> = {
  none: (n) => `No card ${n}`,
  hidden: (n) => `Card ${n} is hidden with the answered cards (H shows them)`,
  retired: (n) => `Card ${n} was removed`,
};

export interface GoDeps {
  /** Card `n` on the board as drawn now (`goTarget`). */
  find(n: number): GoTarget;
  /** Select and focus card `id`, panning only when it is off screen (ruling 3). */
  arrive(id: string): void;
  /** Open board version `version`, read-only, with the answers as at line `until` (versions.ts). */
  past(version: number, until?: number): Promise<void>;
  /** The box changed; null closes it. */
  show(box: GoBox | null): void;
  /** The goAfterPause flag: the pause that goes by itself, in ms; absent, nothing goes by itself. */
  pause?: number;
  timer?: { set(f: () => void, ms: number): unknown; clear(handle: unknown): void };
}

export interface GoTo {
  readonly box: GoBox | null;
  /** A digit typed on the board: open the box holding it; false for any other key. */
  open(key: string): boolean;
  /** The field's text changed (typing, Backspace): its digits. */
  edit(text: string): void;
  /** Enter: go to the number, or say why not and stay open. */
  enter(): void;
  /** Go to card `n` chosen elsewhere (the toolbar's open list, open-list FE_01) as Enter would for
   *  the box holding it: an open box closes; not there, the box opens saying why. */
  to(n: number): void;
  /** Esc, or focus leaving the box: close it without going. */
  close(): void;
  /** The retired card's offer: open its version, and go to it there. */
  openPast(): Promise<void>;
}

export function createGoTo(d: GoDeps): GoTo {
  const timer = d.timer ?? { set: (f: () => void, ms: number) => setTimeout(f, ms), clear: (h: unknown) => clearTimeout(h as number) };
  let box: GoBox | null = null;
  let waiting: unknown = null;

  const stop = () => { if (waiting !== null) timer.clear(waiting); waiting = null; };
  const show = (b: GoBox | null) => { box = b; d.show(b); };
  function typed(text: string) {
    stop();
    show({ text: goDigits(text) });
    if (d.pause !== undefined && box!.text) waiting = timer.set(() => { waiting = null; enter(); }, d.pause);
  }
  function close() {
    stop();
    if (box) show(null);
  }
  function enter() {
    stop();
    if (!box?.text) return;
    const n = Number(box.text);
    const t = d.find(n);
    if (t.to === 'card') {
      close();
      return d.arrive(t.id);
    }
    const past = t.to === 'retired' && t.version !== undefined
      ? { version: t.version, ...(t.until !== undefined && { until: t.until }), label: `Show v${t.version}, where it last appeared` } : undefined;
    show({ text: box.text, said: SAYS[t.to](n), ...(past && { past }) });
  }

  return {
    get box() { return box; },
    open(key) {
      if (!/^\d$/.test(key)) return false;
      typed(key);
      return true;
    },
    edit: typed,
    enter,
    to(n) {
      stop();
      box = { text: String(n) };
      enter();
    },
    close,
    async openPast() {
      const past = box?.past;
      if (!past || !box) return;
      const n = Number(box.text);
      close();
      await d.past(past.version, past.until);
      const t = d.find(n);
      if (t.to === 'card') d.arrive(t.id);
    },
  };
}
