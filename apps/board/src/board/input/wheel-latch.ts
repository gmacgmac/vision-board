// Wheel chaining (wheelChaining flag, cortex-tasks/board/2026-11-05_board-app_wheel-chaining.md): the
// wheel scrolls what is under the pointer while it can still scroll that way, else the board pans. As
// browsers latch a scroll, the target a gesture's first moving wheel event finds keeps the whole gesture,
// until a quiet gap of WHEEL_GAP, so a flick's momentum never spills from a bubble into a pan; the
// next gesture at the edge pans (FIX_04 ruling 2, point 460, settling tracker M4). An event that does not
// move (a trackpad's first, or the browser's own zero-delta wheel) decides nothing. pointer.ts asks
// `target`: an element (its own scroll: the board leaves the event alone) or null (the board pans).

/** The quiet gap that ends a wheel gesture, in ms: a trackpad's momentum that follows the fingers stays in it (FIX_04). */
export const WHEEL_GAP = 200;

/** What deciding whether a box can scroll needs: its scroll position and sizes, and its overflow. */
export interface ScrollBox {
  scrollTop: number; scrollLeft: number; scrollHeight: number; scrollWidth: number; clientHeight: number; clientWidth: number;
}
export interface Overflow { overflowX: string; overflowY: string }

/** Less than this left to scroll is the edge (a fractional scroll position never quite reaches it). */
const EDGE = 1;
const scrolls = (o: string) => o === 'auto' || o === 'scroll' || o === 'overlay';

/** Whether `b` can still scroll by the wheel's (dx, dy): its overflow scrolls on that axis and it is
 *  not at that edge. */
export function canScroll(b: ScrollBox, o: Overflow, dx: number, dy: number): boolean {
  const y = dy !== 0 && scrolls(o.overflowY) && (dy > 0 ? b.scrollTop + b.clientHeight < b.scrollHeight - EDGE : b.scrollTop > EDGE);
  const x = dx !== 0 && scrolls(o.overflowX) && (dx > 0 ? b.scrollLeft + b.clientWidth < b.scrollWidth - EDGE : b.scrollLeft > EDGE);
  return y || x;
}

/** The first element on the event's path, below `stop`, that can still scroll by (dx, dy); null: none. */
export function scrollerOn<E extends ScrollBox>(path: readonly unknown[], stop: unknown, dx: number, dy: number,
  style: (el: E) => Overflow, isBox: (t: unknown) => t is E): E | null {
  for (const t of path) {
    if (t === stop) return null;
    if (isBox(t) && canScroll(t, style(t), dx, dy)) return t;
  }
  return null;
}

/** What the latch reads of a wheel event. */
export type WheelAt = Pick<WheelEvent, 'timeStamp' | 'deltaX' | 'deltaY'>;

/** The latch: `target(e)` is what this wheel event's gesture scrolls, `find`'s answer at its first event that moves
 *  (found again once that is off the page), or null when the board pans (and while nothing has moved yet). */
export function createWheelLatch<T extends { isConnected: boolean }, E extends WheelAt = WheelAt>(find: (e: E) => T | null,
  gap = WHEEL_GAP): { target(e: E): T | null } {
  /** The gesture's target; undefined until its first event that moves. */
  let on: T | null | undefined;
  let last = -Infinity;
  return {
    target(e) {
      if (e.timeStamp - last > gap || (on && !on.isConnected)) on = undefined;
      last = e.timeStamp;
      if (on === undefined && (e.deltaX !== 0 || e.deltaY !== 0)) on = find(e);
      return on ?? null;
    },
  };
}

/** On the page: the element under the pointer, or an ancestor below `stage`, that can still scroll. */
export const scrollerIn = (stage: Element) => (e: WheelEvent): Element | null =>
  scrollerOn(e.composedPath(), stage, e.deltaX, e.deltaY, (el: Element) => getComputedStyle(el), (t): t is Element => t instanceof Element);
