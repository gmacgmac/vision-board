// Sending the person's acts (split out of controller.ts in 3_FE_03, which a move would have grown
// past 300 lines). One act goes through the I/O module and is drawn as soon as its answer is
// applied; a batch (moves.ts: a move, then the cards' pins and status acts) runs step by step,
// each step's acts side by side, and the board is drawn ONCE when the last answer is in, so a
// move of 50 cards lays out its two containers once (3_FE_03 ruling 9).
import type { LedgerEvent } from '../../../../packages/format/src/index.ts';
import type { ActFields } from './io.ts';
import { ApiError, sendAct } from './io.ts';

export interface SenderDeps {
  board(): string;
  /** Apply the stored line the server answered with. */
  own(e: LedgerEvent): Promise<void>;
  redraw(): void;
  /** Show a refusal (the error toast). */
  fail(err: unknown): void;
}

export interface Sender {
  /** Send one act and draw it; null when it was recorded, else the problem's detail. */
  attempt(fields: ActFields): Promise<string | null>;
  record(fields: ActFields): Promise<boolean>;
  /** Send `steps` in order, the acts of one step side by side, and draw once at the end. Stops
   *  after a step with a refusal; true when every act was recorded. */
  run(steps: readonly (readonly ActFields[])[]): Promise<boolean>;
  /** A batch is running: the board is drawn when it ends, not before. */
  readonly held: boolean;
  /** Resolves once no act is on its way (the test hook's `idle`). */
  idle(): Promise<void>;
}

export function createSender(d: SenderDeps): Sender {
  /** Every act and batch on its way, so `idle` waits for them. */
  const sending = new Set<Promise<unknown>>();
  let hold = 0;

  /** Track `p` until it settles. */
  async function tracked<T>(p: Promise<T>): Promise<T> {
    sending.add(p);
    try {
      return await p;
    } finally {
      sending.delete(p);
    }
  }

  async function send(fields: ActFields): Promise<string | null> {
    try {
      await tracked(sendAct(d.board(), fields).then((e) => d.own(e)));
      return null;
    } catch (err) {
      d.fail(err);
      return err instanceof ApiError ? err.message : String(err);
    }
  }

  async function attempt(fields: ActFields): Promise<string | null> {
    const problem = await send(fields);
    if (problem === null) d.redraw();
    return problem;
  }

  async function steps(list: readonly (readonly ActFields[])[]): Promise<boolean> {
    for (const step of list) {
      const answers = await Promise.all(step.map(send));
      if (answers.some((a) => a !== null)) return false;
    }
    return true;
  }

  return {
    attempt,
    record: async (fields) => (await attempt(fields)) === null,
    async run(list) {
      hold += 1;
      try {
        return await tracked(steps(list));
      } finally {
        hold -= 1;
        d.redraw();
      }
    },
    get held() { return hold > 0; },
    async idle() {
      while (sending.size) await Promise.allSettled([...sending]);
    },
  };
}
