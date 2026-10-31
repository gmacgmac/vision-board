// Taking the board down in a page that goes on living (`mount`'s `unmount`): every step runs, whatever one of
// them does. A host's unsubscribe is a step, and a host may hand back nothing or one that throws; the board
// still leaves, its listeners and its elements with it. No DOM.

/** Runs each step in order. One that is not a function is passed over; one that throws is reported, and the rest run. */
export function finishAll(steps: readonly unknown[]): void {
  for (const step of steps) {
    if (typeof step !== 'function') continue;
    try { step(); } catch (err) { console.error(err); }
  }
}

/** Hears `listener` through a host's `on`, and gives back the stop that holds whatever the host's unsubscribe does: one
 *  that does nothing, or returns nothing, still leaves a stopped mount deaf. Every subscription to the host comes through here. */
export function hearUntilStopped<A extends unknown[]>(on: (heard: (...args: A) => void) => unknown, listener: (...args: A) => void): () => void {
  let hearing = true;
  const off = on((...args) => { if (hearing) listener(...args); });
  return () => {
    hearing = false;
    finishAll([off]);
  };
}
