// A turn's time limit (HOLD_01, PLAN ruling 335): it counts only the agent's own working time. The
// clock runs out `limitMs` after it starts; `hold(true)` stops it while a question waits for the
// person, `hold(false)` goes on with the time that was left. Both adapters use it, so a turn
// that works for ten minutes on its own is stopped and one that waits a day for an answer is not.

export interface TurnClock {
  /** Stop the clock (a question waits) or go on with the time left. Saying the same twice changes nothing. */
  hold(on: boolean): void;
  /** End the clock for good: no expiry, and a later `hold` does nothing. */
  stop(): void;
}

/** Start a clock that calls `onExpire` once, when `limitMs` of running time has passed. */
export function startTurnClock(limitMs: number, onExpire: () => void): TurnClock {
  let left = limitMs;
  let since = Date.now();
  let ended = false;
  let timer: NodeJS.Timeout | undefined;
  const run = () => {
    since = Date.now();
    timer = setTimeout(() => { ended = true; timer = undefined; onExpire(); }, Math.max(0, left));
  };
  run();
  return {
    hold(on) {
      if (ended) return;
      if (on && timer) {
        clearTimeout(timer);
        timer = undefined;
        left -= Date.now() - since;
      } else if (!on && !timer) run();
    },
    stop() {
      ended = true;
      clearTimeout(timer);
      timer = undefined;
    },
  };
}
