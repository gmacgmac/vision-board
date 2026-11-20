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
  const listen = new AbortController();
  const on = <K extends keyof HTMLElementEventMap>(type: K, f: (e: HTMLElementEventMap[K]) => void, capture = false) =>
    d.stage.addEventListener(type, f, { capture, passive: true, signal: listen.signal });

  on('pointerover', (e) => {
    const disc = discOf(e);
    if (!disc || e.pointerType === 'touch' || (quiet && idOf(disc) === quiet) || smallMark(disc)) return;
    cancel();
    wait = window.setTimeout(() => {
      const id = idOf(disc);
      if (id && disc.matches(':hover') && d.may(disc)) d.open(disc, id);
    }, REST_OPEN_MS);
  });
  on('pointerout', (e) => {
    const disc = discOf(e);
    if (!disc) return;
    cancel();
    if (idOf(disc) === quiet) quiet = undefined;
  });
  // Where the pointer is, anywhere on the page (off the stage too), for `closed`.
  document.addEventListener('pointermove', (e) => { at = e.pointerType === 'touch' ? null : { x: e.clientX, y: e.clientY }; }, { passive: true, signal: listen.signal });
  on('pointerdown', cancel, true);

  return {
    closed(disc) {
      quiet = disc?.isConnected && at && pointOn(disc, at.x, at.y) ? idOf(disc) : undefined;
    },
    destroy() {
      cancel();
      listen.abort();
    },
  };
}
