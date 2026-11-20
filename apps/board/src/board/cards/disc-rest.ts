// The answer disc opens its picker when the pointer rests on it (D-112): after the shared rest wait (`REST_OPEN_MS`),
// never at once, so a pointer crossing the board opens nothing. Not on touch (a tap opens it, as a click does), not on
// a disc too small to press (past the far breakpoint), not while the agent proposes an answer (a click opens the
// proposal box) or the board can't take one, and not while another menu or box is open. A press cancels the wait. Once
// a picker closes with the pointer still on its disc (a choice, Esc), the disc stays quiet until the pointer leaves it,
// so ticking never opens the picker again under the pointer. Browser only.
import { REST_OPEN_MS } from '#ui';
import { smallMark } from '../canvas/index.ts';
import { pointOn } from './mark-place.ts';

const DISC = 'vb-node[data-edges] [data-mark="answer"]';

export interface DiscRestDeps {
  stage: HTMLElement;
  /** Whether a rest may open the picker on `disc` now (nothing else open, the board takes an answer). */
  may(disc: HTMLElement): boolean;
  /** Open the picker on `disc`, of node `id`, leaving focus where it is. */
  open(disc: HTMLElement, id: string): void;
}

export interface DiscRest {
  /** A picker on `disc` closed: quiet until the pointer leaves the disc, if it is on it now. */
  closed(disc: HTMLElement | null): void;
  destroy(): void;
}

/** The node a disc is on (a redraw may replace the disc, never the node's id). */
const idOf = (disc: HTMLElement): string | undefined => disc.closest<HTMLElement>('vb-node')?.dataset.id;

export function createDiscRest(d: DiscRestDeps): DiscRest {
  let wait = 0;
  let quiet: string | undefined;
  let at: { x: number; y: number } | null = null;
  const cancel = () => clearTimeout(wait);
  /** The disc an event crossed into or out of, or null when it moved within one. */
  const discOf = (e: PointerEvent) => {
    const disc = (e.target as Element).closest?.<HTMLElement>(DISC);
    return disc && !disc.contains(e.relatedTarget as Node | null) ? disc : null;
  };
  /** Every listener, so `destroy` takes each off by name (a host counts what the board leaves on its document). */
  const heard: [EventTarget, string, (e: PointerEvent) => void, boolean][] = [];
  const on = (target: EventTarget, type: string, f: (e: PointerEvent) => void, capture = false) => {
    heard.push([target, type, f, capture]);
    target.addEventListener(type, f as EventListener, { capture, passive: true });
  };

  on(d.stage, 'pointerover', (e) => {
    const disc = discOf(e);
    if (!disc || e.pointerType === 'touch' || (quiet && idOf(disc) === quiet) || smallMark(disc)) return;
    cancel();
    wait = window.setTimeout(() => {
      const id = idOf(disc);
      if (id && disc.matches(':hover') && d.may(disc)) d.open(disc, id);
    }, REST_OPEN_MS);
  });
  on(d.stage, 'pointerout', (e) => {
    const disc = discOf(e);
    if (!disc) return;
    cancel();
    if (idOf(disc) === quiet) quiet = undefined;
  });
  // Where the pointer is, anywhere on the page (off the stage too), for `closed`.
  on(document, 'pointermove', (e) => { at = e.pointerType === 'touch' ? null : { x: e.clientX, y: e.clientY }; });
  on(d.stage, 'pointerdown', cancel, true);

  return {
    closed(disc) {
      quiet = disc?.isConnected && at && pointOn(disc, at.x, at.y) ? idOf(disc) : undefined;
    },
    destroy() {
      cancel();
      for (const [target, type, f, capture] of heard.splice(0)) target.removeEventListener(type, f as EventListener, { capture });
    },
  };
}
