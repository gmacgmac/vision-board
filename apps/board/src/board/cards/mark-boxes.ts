// The boxes a node's marks open (nodeEdges flag, D-099 1; the design review of DESIGN_01): the change badge, or H,
// opens the history box (with the stepper on top, planner's call 9), and the disc of a node with a proposal opens the
// proposal box beside it, to its right. Both are the node's own card popover boxes (packages/ui node-edges.ts), opened
// by a click or a key only, never on hover: a second press on the mark closes it, as do Esc (focus back to the mark)
// and a click outside (focus where it was pressed); a drag outside, a pan, leaves it open. Focus moves in on opening.
// The history box is filled as it shows, by the same event the old ⓘ fired (`POPOVER_SHOW`, history-flow.ts). One
// box or menu is open at a time: the caller closes the other first. Both are placed as every box beside a node is
// (mark-place.ts `placeBeside`): top aligned with the node, right or below, the arrow on the mark; the box sits in the
// node, so its place is written in the node's own pixels, counter-scaled so it keeps one size at any zoom (D-101). Its × (`data-box-close`) closes it.
// Browser only.
import type { PopoverShowDetail } from '#ui';
import { dismissable, POPOVER_HIDE, POPOVER_OPEN, POPOVER_SHOW } from '#ui';
import { DRAG_THRESHOLD } from '../input/index.ts';
import { nodeReach, placeBeside, stageBoxOf } from './mark-place.ts';

/** The boxes: the history (the badge, H) and the proposal (the disc while a proposal waits). */
export type MarkBoxName = 'history' | 'proposal';

export interface MarkBox {
  readonly id: string;
  readonly name: MarkBoxName;
  /** The box, gone once its node is drawn again. */
  readonly el: HTMLElement;
  close(focusBack?: boolean): void;
  /** Follow the node after a pan, a zoom or a draw. */
  place(): void;
}

/** The box beside its node (`placeBeside`), measured on the stage and written in the node's pixels (`k`: its zoom). It
 *  keeps one size at any zoom (D-101): scaled by 1/k about its top left (node-box.css reads `--vb-box-scale`), so it
 *  measures what it draws, and its arrow, in stage pixels. */
function place(card: HTMLElement, box: HTMLElement, opener: HTMLElement | null): void {
  const stage = card.closest<HTMLElement>('.vb-stage');
  if (!stage || !card.offsetWidth) return;
  const c = stageBoxOf(card, stage);
  const k = c.w / card.offsetWidth;
  const at = placeBeside(nodeReach(card, stage), { w: box.offsetWidth, h: box.offsetHeight }, { w: stage.clientWidth, h: stage.clientHeight },
    opener && !opener.hidden ? stageBoxOf(opener, stage) : c);
  box.dataset.side = at.side;
  // left and top are from the node's padding edge: inside its border.
  box.style.left = `${(at.x - c.x) / k - card.clientLeft}px`;
  box.style.top = `${(at.y - c.y) / k - card.clientTop}px`;
  box.style.setProperty('--vb-box-scale', String(1 / k));
  box.style.setProperty('--vb-arrow', `${at.arrow}px`);
}

/** `back`: where focus goes on Esc (the opener, or the node when H opened it with no badge shown). */
export function openMarkBox(card: HTMLElement, name: MarkBoxName, opener: HTMLElement | null, back: HTMLElement, closed: () => void): MarkBox | null {
  const found = card.querySelector<HTMLElement>(`.vb-card-pop[data-pop="${name}"]`);
  if (!found) return null;
  const box: HTMLElement = found;
  let open = true;
  box.toggleAttribute('data-open', true);
  place(card, box, opener);
  opener?.setAttribute('aria-expanded', 'true');
  card.dispatchEvent(new CustomEvent<PopoverShowDetail>(POPOVER_SHOW, { bubbles: true, detail: { name, box } }));
  const stop = dismissable({
    within: (t) => box.contains(t) || !!opener?.contains(t), clickWithin: DRAG_THRESHOLD, escape: card,
    dismiss: (why) => close(why === 'escape'),
  });
  const onClose = (e: Event) => { if ((e.target as Element).closest('[data-box-close]')) close(); };
  box.addEventListener('click', onClose);
  function close(focusBack = true): void {
    if (!open) return;
    open = false;
    stop();
    box.removeAttribute('data-open');
    box.removeEventListener('click', onClose);
    opener?.setAttribute('aria-expanded', 'false');
    card.dispatchEvent(new CustomEvent<string>(POPOVER_HIDE, { bubbles: true, detail: name }));
    closed();
    if (focusBack && back.isConnected) back.focus({ preventScroll: true });
  }
  // The box scrolls when long, so it is a tab stop (history); else its first button that acts (a proposal's).
  (box.tabIndex >= 0 ? box : box.querySelector<HTMLElement>('button:not([aria-disabled="true"])') ?? box).focus({ preventScroll: true });
  // Opened for good, as the old tab's click did: the stepper it holds opens too (update-flow.ts).
  card.dispatchEvent(new CustomEvent<HTMLElement>(POPOVER_OPEN, { bubbles: true, detail: box }));
  return { id: box.id, name, el: box, close, place: () => { if (open && box.isConnected) place(card, box, opener); } };
}
