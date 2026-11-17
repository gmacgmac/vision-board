// The boxes a node's marks open (nodeEdges flag, D-099 1; the design review of DESIGN_01): the change badge, or H,
// opens the history box (with the stepper on top, planner's call 9), and the disc of a node with a proposal opens the
// proposal box beside it, to its right. Both are the node's own card popover boxes (packages/ui node-edges.ts), opened
// by a click or a key only, never on hover: a second press on the mark closes it, as do Esc (focus back to the mark)
// and a click outside (focus where it was pressed); a drag outside, a pan, leaves it open. Focus moves in on opening.
// The history box is filled as it shows, by the same event the old ⓘ fired (`POPOVER_SHOW`, history-flow.ts). One
// box or menu is open at a time: the caller closes the other first. Browser only.
import type { PopoverShowDetail } from '#ui';
import { dismissable, POPOVER_HIDE, POPOVER_OPEN, POPOVER_SHOW } from '#ui';
import { DRAG_THRESHOLD } from '../input/index.ts';

/** The boxes: the history (the badge, H) and the proposal (the disc while a proposal waits). */
export type MarkBoxName = 'history' | 'proposal';

export interface MarkBox {
  readonly id: string;
  readonly name: MarkBoxName;
  /** The box, gone once its node is drawn again. */
  readonly el: HTMLElement;
  close(focusBack?: boolean): void;
}

/** A box with no room on the node's right, in the stage, opens on its left when there is room there (`data-flip`). */
function flip(card: HTMLElement, box: HTMLElement): void {
  const stage = card.closest('.vb-stage')?.getBoundingClientRect();
  const [b, c] = [box.getBoundingClientRect(), card.getBoundingClientRect()];
  box.toggleAttribute('data-flip', !!stage && b.right > stage.right && c.left - (b.left - c.right) - b.width >= stage.left);
}

/** `back`: where focus goes on Esc (the opener, or the node when H opened it with no badge shown). */
export function openMarkBox(card: HTMLElement, name: MarkBoxName, opener: HTMLElement | null, back: HTMLElement, closed: () => void): MarkBox | null {
  const found = card.querySelector<HTMLElement>(`.vb-card-pop[data-pop="${name}"]`);
  if (!found) return null;
  const box: HTMLElement = found;
  let open = true;
  box.toggleAttribute('data-open', true);
  flip(card, box);
  opener?.setAttribute('aria-expanded', 'true');
  card.dispatchEvent(new CustomEvent<PopoverShowDetail>(POPOVER_SHOW, { bubbles: true, detail: { name, box } }));
  const stop = dismissable({
    within: (t) => box.contains(t) || !!opener?.contains(t), clickWithin: DRAG_THRESHOLD, escape: card,
    dismiss: (why) => close(why === 'escape'),
  });
  function close(focusBack = true): void {
    if (!open) return;
    open = false;
    stop();
    box.removeAttribute('data-open');
    box.removeAttribute('data-flip');
    opener?.setAttribute('aria-expanded', 'false');
    card.dispatchEvent(new CustomEvent<string>(POPOVER_HIDE, { bubbles: true, detail: name }));
    closed();
    if (focusBack && back.isConnected) back.focus({ preventScroll: true });
  }
  // The box scrolls when long, so it is a tab stop (history); else its first button that acts (a proposal's).
  (box.tabIndex >= 0 ? box : box.querySelector<HTMLElement>('button:not([aria-disabled="true"])') ?? box).focus({ preventScroll: true });
  // Opened for good, as the old tab's click did: the stepper it holds opens too (update-flow.ts).
  card.dispatchEvent(new CustomEvent<HTMLElement>(POPOVER_OPEN, { bubbles: true, detail: box }));
  return { id: box.id, name, el: box, close };
}
