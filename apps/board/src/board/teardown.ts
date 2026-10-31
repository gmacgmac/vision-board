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
