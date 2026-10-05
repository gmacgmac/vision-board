// Counting the work (N12_FE_01 ruling 6, docs/specification/performance.md § Counting the work).
// The page counts what each change costs it, so a test can prove an event touched only what it
// should: cards updated, cards measured, containers laid out, links redrawn, full fetches. The
// counters are plain numbers the page bumps as it works; they are readable from outside only as
// `window.__vbWork`, which exists only when the address carries `?vbwork` (the page tests set it),
// so a person's page exposes nothing.

export interface WorkCounts {
  /** Cards whose element was rendered or updated (`render` or `update` on a `<vb-node>`). */
  cardsUpdated: number;
  /** Cards whose size was read from the browser. */
  cardsMeasured: number;
  /** Cards whose place (transform or hidden) was written. */
  cardsPlaced: number;
  /** Containers laid out again (their layout mode ran). */
  containersLaidOut: number;
  /** Connectors whose path or look was written. */
  linksRedrawn: number;
  /** Reads of the whole ledger: opening the page, a ledger that went back, a format it cannot apply. */
  fullFetches: number;
}

export interface Work extends WorkCounts {
  /** The containers laid out since the last reset, in order. */
  containers: string[];
  /** Milliseconds from navigation start to the end of the first draw. */
  firstDrawMs: number | null;
}

const zero = (): Work => ({
  cardsUpdated: 0, cardsMeasured: 0, cardsPlaced: 0, containersLaidOut: 0, linksRedrawn: 0, fullFetches: 0,
  containers: [], firstDrawMs: null,
});

/** The page's one set of counters. */
export const work: Work = zero();

/** Zero every counter but the first-draw time. */
export function resetWork(): void {
  Object.assign(work, { ...zero(), firstDrawMs: work.firstDrawMs });
}

/** What a page test reads and calls through `window.__vbWork`. */
export interface WorkHook {
  work: Work;
  reset(): void;
  /** Throw away everything drawn and the held state, read the whole ledger, draw from scratch. */
  rebuild(): Promise<void>;
  /** Resolves once no read is in flight and no draw is waiting for a frame. */
  idle(): Promise<void>;
}

/** Expose the hook, only when the address asks for it with `?vbwork`. */
export function exposeWork(hook: Omit<WorkHook, 'work' | 'reset'>): void {
  if (!new URLSearchParams(location.search).has('vbwork')) return;
  (globalThis as { __vbWork?: WorkHook }).__vbWork = { work, reset: resetWork, ...hook };
}
