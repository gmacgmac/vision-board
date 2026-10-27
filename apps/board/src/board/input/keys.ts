// Keyboard: every pointer action has a key (project rule 5). Shortcuts come from the action
// registry and the page's command table (commands.ts), so a new action or command with a key
// works here without changes. A digit is one such command: it opens the Go to card box (go-to-card.ts).
import type { ActionId } from '#format';
import { ACTIONS } from '#actions';
import type { CommandId } from './commands.ts';
import { commandForKey, regionCommandForKey } from './commands.ts';

export interface KeyHandlers {
  act(id: string, action: ActionId): void;
  /** Shift+F on a focused card: its flag on or off (cardFlag flag, flag-flow.ts); absent with the
   *  flag off, when Shift+F stays Fit like F. */
  flag?(id: string): void;
  nudge(id: string, dx: number, dy: number): void;
  /** Alt+arrows with focus on a container's grip (3_FE_04 ruling 8): the cards' step. */
  nudgeRegion(region: string, dx: number, dy: number): void;
  /** A key the command table gives a container's title line (C or N: its note), with focus on
   *  that line or its controls. */
  regionCommand(id: CommandId, region: string): void;
  unpin(id: string): void;
  /** Space on a focused card: add it to the selection, or take it out (3_FE_01 ruling 3). */
  toggle(id: string): void;
  step(from: string | null, dir: 1 | -1): void;
  /** A view command (3_FE_02 ruling 5: F, +, -, Z, N, C; 3_FE_03: Shift+M); false when it does not
   *  apply now, so the key falls through (C on one card is that card's comment). */
  command(id: CommandId, key: string): boolean;
  toggleHide(): void;
  escape(): void;
}

const NUDGE = 16;
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};
const BY_KEY = new Map(
  Object.values(ACTIONS).filter((a) => a.key && a.onItem).map((a) => [a.key!, a.id]),
);

/** Alt+arrow nudges the focused card, or the container whose grip has focus: it becomes a pin. True when it did. */
function nudged(h: KeyHandlers, e: KeyboardEvent, id: string | null, region: string | undefined, target: HTMLElement): boolean {
  const arrow = ARROWS[e.key];
  const grip = region !== undefined && target.matches('.vb-region-grip');
  if (!arrow || !(id || grip) || !e.altKey) return false;
  e.preventDefault();
  const step = NUDGE * (e.shiftKey ? 4 : 1);
  if (id) h.nudge(id, arrow[0] * step, arrow[1] * step);
  else h.nudgeRegion(region!, arrow[0] * step, arrow[1] * step);
  return true;
}

/** Moving between cards and the card-level keys: Space, J and K, the arrows, Shift+F. True when one applied. */
function onCard(h: KeyHandlers, e: KeyboardEvent, key: string, id: string | null, target: HTMLElement): boolean {
  const go = (f: () => void) => { e.preventDefault(); f(); return true; };
  // Only on the card itself: Space on one of its buttons presses the button.
  if (key === ' ' && id && target.localName === 'vb-node') return go(() => h.toggle(id));
  if (key === 'j' || (id && (e.key === 'ArrowDown' || e.key === 'ArrowRight'))) return go(() => h.step(id, 1));
  if (key === 'k' || (id && (e.key === 'ArrowUp' || e.key === 'ArrowLeft'))) return go(() => h.step(id, -1));
  // Shift+F on a card is its flag (field report batch 2 assumption A): F alone is Fit.
  return !!(id && h.flag && e.shiftKey && key === 'f') && go(() => h.flag!(id));
}

/** The commands and card actions a key stands for. True when one applied. */
function onCommand(h: KeyHandlers, e: KeyboardEvent, key: string, id: string | null): boolean {
  // A Shift combination a command claims (Shift+M, 3_FE_03 ruling 8) is that command's alone: it
  // never falls through to the plain key's action.
  const shifted = e.shiftKey ? commandForKey(`shift+${key}`) : undefined;
  if (shifted) { e.preventDefault(); h.command(shifted, `shift+${key}`); return true; }
  const cmd = commandForKey(key);
  if (cmd && h.command(cmd, key)) { e.preventDefault(); return true; }
  if (id && BY_KEY.has(key)) { e.preventDefault(); h.act(id, BY_KEY.get(key)!); return true; }
  // R with no selection (a selection's R is Reset places, commands.ts): the focused card's reset.
  if (id && key === 'r') { h.unpin(id); return true; }
  if (key === 'h') { h.toggleHide(); return true; }
  return false;
}

/** One key press: what it does on the board, if anything. */
function route(h: KeyHandlers, e: KeyboardEvent, root?: HTMLElement, pageWide = false): void {
  const target = e.target as HTMLElement;
  // Whose key it is: a key in another board's root is never this one's; under a host a key outside
  // every board (a host's button, its text field) is the host's. Only the board's own page hears them.
  const board = target.closest?.('.vb-board') ?? null;
  if (root && board !== root && (board || !pageWide)) return;
  // A card's popover box (its Accept, its Reject) takes no card shortcuts: A there is not Acknowledge.
  if (e.defaultPrevented || target.closest('input, textarea, select, dialog, .vb-card-pop')) return;
  if (e.key === 'Escape') return h.escape();
  if (e.metaKey || e.ctrlKey) return;
  const id = target.closest<HTMLElement>('vb-node')?.dataset.id ?? null;
  /** The container whose title line (or one of its controls) has focus, outside every card. */
  const region = id ? undefined : target.closest('.vb-region-head')?.closest<HTMLElement>('vb-region')?.dataset.region;
  if (nudged(h, e, id, region, target) || e.altKey) return;
  const key = e.key.toLowerCase();
  const onRegion = region !== undefined && !e.shiftKey ? regionCommandForKey(key) : undefined;
  if (onRegion) {
    e.preventDefault();
    return h.regionCommand(onRegion, region!);
  }
  if (!onCard(h, e, key, id, target)) onCommand(h, e, key, id);
}

/** Listens on the document; returns the function that stops listening. A key acts only when its
 * target is inside this board's `root` (a `.vb-board`); a key in another board's root (two boards
 * on one page) is that board's. With `pageWide`, the board has its own page (the standalone app),
 * and a key outside every board still reaches it; under a host (nclite: "a view stays inside its
 * root") it never does, Esc included. */
export function bindKeys(h: KeyHandlers, root?: HTMLElement, pageWide = false): () => void {
  const onKey = (e: KeyboardEvent) => route(h, e, root, pageWide);
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}
