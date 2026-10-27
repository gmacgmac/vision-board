// Card size tiers on the page (D-030, the nodeSize flag): the tier each card is drawn at, the act a
// pick sends, and the control's Esc and aria-expanded behaviour. The pill opens in CSS (node.css),
// on hover or keyboard focus, so nothing here holds an open state.
import type { ActSize, NodeSize, ViewNode } from '#format';
import { ACT_SIZES } from '#format';
import type { BoardState } from '#actions';
import { sizeTier } from '#layout';
import type { ActFields } from './io.ts';

/** The tier a card is drawn at: the person's pick, else the agent's suggestion or the auto tier. */
export const tierOf = (n: ViewNode, s: BoardState): NodeSize => sizeTier(n, s.sizes.get(n.id));

export const isSizePick = (v: string | undefined): v is ActSize => (ACT_SIZES as readonly string[]).includes(v ?? '');

/** The person's `size` act; `auto` removes their pick (api.md 16). No `ver`: it is about the
 *  node's place on the board, like `pin`. `ActFields` (io.ts) has no `size` field yet, so the
 *  extra field rides on an intersection the I/O module sends unchanged. */
export const sizeAct = (id: string, size: ActSize): ActFields =>
  ({ action: 'size', n: Number(id), size });

/** Esc inside a size control closes it by returning focus to the card. aria-expanded follows
 *  whether the pill shows (hover or focus inside the control). Returns the unbind function. */
export function bindSizeControl(host: HTMLElement): () => void {
  const sync = (box: Element | null) => {
    const trig = box?.querySelector('.vb-size-trig');
    if (box && trig) trig.setAttribute('aria-expanded', String(box.matches(':hover, :focus-within')));
  };
  // After the event, once :hover and :focus-within have moved.
  const later = (e: Event) => {
    const box = (e.target as HTMLElement).closest('.vb-size');
    if (box) setTimeout(() => sync(box));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    const box = (e.target as HTMLElement).closest('.vb-size');
    if (!box) return;
    e.preventDefault();
    box.closest<HTMLElement>('vb-node')?.focus({ preventScroll: true });
  };
  const events = ['focusin', 'focusout', 'mouseover', 'mouseout'] as const;
  for (const name of events) host.addEventListener(name, later);
  host.addEventListener('keydown', onKey);
  return () => {
    for (const name of events) host.removeEventListener(name, later);
    host.removeEventListener('keydown', onKey);
  };
}
