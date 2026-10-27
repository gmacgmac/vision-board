// Sending the person's acts (split out of controller.ts in 3_FE_03, which a move would have grown
// past 300 lines). One act goes through the I/O module and is drawn as soon as its answer is
// applied; a batch (moves.ts: a move, then the cards' pins and status acts) runs step by step,
// each step's acts side by side, and the board is drawn ONCE when the last answer is in, so a
// move of 50 cards lays out its two containers once (3_FE_03 ruling 9). The person's board lines
// (New board, Rename board: `put_board`, api.md 90) go out here too. While a past version of
// the board shows (versions.ts), every act is refused here, before it is sent: the one funnel
// (navigation FE_01 ruling 5), and on a locked board every line that would change it (lock-flow.ts,
// N40 ruling 7): `refusal` is asked before each line goes. A card seen (FE_02: selecting a changed
// card, a step of its stepper) goes out here too, in order, so every line the person adds has one
// way out, and so do the person's marks on a whole board (`actOn`: archive, restore, lock, unlock,
// api.md 135, 138), which may name a board other than the open one, and the person's removal of
// cards or a container (`retire`, `retire_cards`, N24).
import type { ActionId, LedgerLine } from '#format';
import type { ActFields, BoardFields, Io, RetireFields } from './io.ts';
import { ApiError } from './io.ts';
import * as sendWords from './words/send.ts';

/** A line the page would send: an act, a seen, the person's `board` line (`put_board`) or their
 * `retire` line (`retire_cards`). */
export interface Outgoing { type: 'act' | 'seen' | 'board' | 'retire'; action?: ActionId }

export interface SenderDeps {
  /** The board's calls (io.ts). */
  io: Pick<Io, 'sendAct' | 'putBoard' | 'retireCards' | 'markCardSeen'>;
  board(): string;
  /** Apply the stored line the server answered with: its cards by number on `board`, the board it
   *  was sent to (card-numbers.ts), whichever board is open by the time it lands. */
  own(line: LedgerLine, board: string): Promise<void>;
  redraw(): void;
  /** Show a refusal (the error toast). */
  fail(err: unknown): void;
  /** Why `line` can't go to `board` now: a past version shows (`READ_ONLY`), or the board is
   *  locked and the line would change it (lock-flow.ts); null when it may go. */
  refusal(board: string, line: Outgoing): string | null;
}

/** Why an act is refused while a past version shows. */
export const READ_ONLY = sendWords.thisIsAPastVersion;

export interface Sender {
  /** Send one act and draw it; null when it was recorded, else the problem's detail. */
  attempt(fields: ActFields): Promise<string | null>;
  record(fields: ActFields): Promise<boolean>;
  /** Create board `id`, or rename it; null when recorded, else the problem's detail. */
  board(id: string, fields: BoardFields): Promise<string | null>;
  /** Remove cards or a container from the open board and draw it; null when recorded, else the problem's detail. */
  retire(fields: RetireFields): Promise<string | null>;
  /** Send one act to board `id`, open or not (archive, restore); null when recorded, else the problem's detail. */
  actOn(id: string, fields: ActFields): Promise<string | null>;
  /** Send `steps` in order, the acts of one step side by side, and draw once at the end. Stops
   *  after a step with a refusal; true when every act was recorded. */
  run(steps: readonly (readonly ActFields[])[]): Promise<boolean>;
  /** Mark each card's version seen, one after another, and draw once at the end; true when all were recorded. */
  seen(marks: readonly { n: number; ver: number }[]): Promise<boolean>;
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

  /** Send one call that answers a stored line, `line` on `board`, and apply it. */
  async function send(call: () => Promise<LedgerLine>, line: Outgoing, board = d.board()): Promise<string | null> {
    const refused = d.refusal(board, line);
    if (refused !== null) {
      d.fail(new ApiError(refused));
      return refused;
    }
    try {
      await tracked(call().then((line) => d.own(line, board)));
      return null;
    } catch (err) {
      d.fail(err);
      return err instanceof ApiError ? err.message : String(err);
    }
  }
  const act = (fields: ActFields) => send(() => d.io.sendAct(d.board(), fields), { type: 'act', action: fields.action });

  async function attempt(fields: ActFields): Promise<string | null> {
    const problem = await act(fields);
    if (problem === null) d.redraw();
    return problem;
  }

  async function steps(list: readonly (readonly ActFields[])[]): Promise<boolean> {
    for (const step of list) {
      const answers = await Promise.all(step.map(act));
      if (answers.some((a) => a !== null)) return false;
    }
    return true;
  }

  /** Hold every draw while `work` runs, then draw once. */
  async function held<T>(work: () => Promise<T>): Promise<T> {
    hold += 1;
    try {
      return await tracked(work());
    } finally {
      hold -= 1;
      d.redraw();
    }
  }

  return {
    attempt,
    record: async (fields) => (await attempt(fields)) === null,
    board: (id, fields) => send(() => d.io.putBoard(id, fields), { type: 'board' }, id), // a board line names no card
    async retire(fields) {
      const problem = await send(() => d.io.retireCards(d.board(), fields), { type: 'retire' });
      if (problem === null) d.redraw();
      return problem;
    },
    actOn: (id, fields) => send(() => d.io.sendAct(id, fields), { type: 'act', action: fields.action }, id),
    run: (list) => held(() => steps(list)),
    seen: (marks) => held(async () => {
      for (const m of marks) if ((await send(() => d.io.markCardSeen(d.board(), m.n, m.ver), { type: 'seen' })) !== null) return false;
      return true;
    }),
    get held() { return hold > 0; },
    async idle() {
      while (sending.size) await Promise.allSettled([...sending]);
    },
  };
}
