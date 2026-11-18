// Wheel chaining (wheelChaining flag, cortex-tasks/board/2026-11-05_board-app_wheel-chaining.md): the
// wheel scrolls what is under the pointer while it can still scroll that way, else the board pans. As
// browsers latch a scroll, the target a gesture's first moving wheel event finds keeps the whole gesture,
// until a quiet gap of WHEEL_GAP, so a flick's momentum never spills from a bubble into a pan; the
// next gesture at the edge pans (FIX_04 ruling 2, point 460, settling tracker M4). An event that does not
// move (a trackpad's first, or the browser's own zero-delta wheel) decides nothing. A fresh push during a momentum
// tail is a new gesture at once, read from the stream's decay and rise, never by waiting the tail out (FIX_05, 485). pointer.ts asks
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

/** Momentum (FIX_05, point 485): a run of this many events, each no faster than the last (`WOBBLE` allowed), is a
 *  decay, the fingers lifted; then an event `RISE` times the slowest of the decay, and `RISE_PX` more, is a fresh push. */
const DECAY_RUN = 4;
const WOBBLE = 1.15;
const RISE = 1.5;
const RISE_PX = 3;

/** How far one wheel event moves, in its own units. */
const moveOf = (e: WheelAt): number => Math.hypot(e.deltaX, e.deltaY);

/** The latch: `target(e)` is what this wheel event's gesture scrolls, `find`'s answer at its first event that moves
 *  (found again once that is off the page), or null when the board pans (and while nothing has moved yet). A gesture
 *  ends at a quiet gap of `gap`, or at once when a fresh push breaks a momentum tail's decay with a rise (FIX_05, point
 *  485): a tail's events stay the scroller's (it swallows them at its end), and the push is decided afresh, so at the
 *  end it pans without waiting for the momentum to die out. A mouse's even notches never decay into a rise. */
export function createWheelLatch<T extends { isConnected: boolean }, E extends WheelAt = WheelAt>(find: (e: E) => T | null,
  gap = WHEEL_GAP): { target(e: E): T | null } {
  /** The gesture's target; undefined until its first event that moves. */
  let on: T | null | undefined;
  let last = -Infinity;
  /** The last event's move, how many in a row did not speed up, and the slowest since the decay set in (null: none). */
  let prev = 0;
  let run = 0;
  let low: number | null = null;
  return {
    target(e) {
      const m = moveOf(e);
      const rise = low !== null && m >= low * RISE && m - low >= RISE_PX;
      if (e.timeStamp - last > gap || (on && !on.isConnected) || rise) [on, run, low] = [undefined, 0, null];
      else {
        run = m <= prev * WOBBLE + 0.5 ? run + 1 : 0;
        if (run >= DECAY_RUN) low = Math.min(low ?? m, m);
      }
      [last, prev] = [e.timeStamp, m];
      if (on === undefined && m !== 0) on = find(e);
      return on ?? null;
    },
  };
}

/** On the page: the element under the pointer, or an ancestor below `stage`, that can still scroll. */
export const scrollerIn = (stage: Element) => (e: WheelEvent): Element | null =>
  scrollerOn(e.composedPath(), stage, e.deltaX, e.deltaY, (el: Element) => getComputedStyle(el), (t): t is Element => t instanceof Element);
