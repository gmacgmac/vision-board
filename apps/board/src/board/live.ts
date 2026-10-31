// The ledger state the page holds, and how it stays current (N12_FE_01 ruling 2, performance.md
// approaches 1 and 5). Opening the page reads the whole ledger once (`read_ledger`, a full fetch,
// counted) and folds it with the shared action layer. After that every new line is applied to the
// same state: the host's change events (`host.events`, host.ts; on the standalone page its project
// stream, `watch_project`, followed from boot whether or not there are boards, FE_02 ruling 1) say a
// line was appended, the board reads only the lines after the last one it holds, and hands them on
// in one batch; an event with no head (a stream that opened again) reads whatever is new. An act the
// page sent itself is applied from its answer when it is the next line. A full fetch happens again
// only when the ledger went back (another project, a reset) or a line has a format the page cannot
// apply. Reloading the page (a rebuilt page, another folder) is the standalone host's (page-host.ts).
import type { LedgerEvent, LedgerLine } from '#format';
import type { LedgerState } from '#actions';
import { applyEvent, foldLedger } from '#actions';
import { canApply } from './board-data.ts';
import { answerEvent } from './card-numbers.ts';
import type { BoardEvent } from './host.ts';
import type { Io } from './io.ts';
import { hearUntilStopped } from './teardown.ts';
import { work } from './work.ts';

export interface Live {
  /** The held state; null until the first `load`. */
  readonly state: LedgerState | null;
  /** Read and fold the whole ledger (a full fetch). */
  load(): Promise<void>;
  /** Read the lines after the held head and apply them. Calls made while a read is in flight
   * share one more read after it, so nothing appended in between is missed. */
  sync(): Promise<void>;
  /** An act the page sent to `board`: its answer (cards by board number, card-numbers.ts) applied
   * in place when it is the next line, else read with the rest. */
  own(line: LedgerLine, board: string): Promise<void>;
  /** Follow the host's change events; a stop function. A read they start that fails goes to `failed`, one that works to `worked`. */
  watch(failed: (err: unknown) => void, worked: () => void): () => void;
  /** Resolves when no read is in flight. */
  settled(): Promise<void>;
}

/** `lines`: the batch applied in place; `full`: the state was read afresh, so draw from scratch. */
export type OnLines = (lines: LedgerEvent[], full: boolean) => void;

export interface LiveDeps {
  readLedger: Io['readLedger'];
  /** The host's change events (`host.events`). */
  events(listener: (e: BoardEvent) => void): () => void;
}

export function createLive(d: LiveDeps, onLines: OnLines): Live {
  let state: LedgerState | null = null;
  let reading: Promise<void> | null = null;
  let again = false;

  async function all(): Promise<LedgerEvent[]> {
    const out: LedgerEvent[] = [];
    for (;;) {
      const page = await d.readLedger(out.at(-1)?.seq ?? 0);
      out.push(...page.events);
      if (!page.more) return out;
    }
  }

  async function load() {
    work.fullFetches += 1;
    state = foldLedger(await all());
    onLines([], true);
  }

  /** Apply what is new; a line already held (an own act applied first) is skipped. */
  function apply(lines: LedgerEvent[]): boolean {
    const s = state!;
    const fresh = lines.filter((e) => e.seq > s.seq);
    if (fresh.some((e) => !canApply(e))) return false;
    for (const e of fresh) applyEvent(s, e);
    if (fresh.length) onLines(fresh, false);
    return true;
  }

  async function readOnce() {
    if (!state) return load();
    const lines: LedgerEvent[] = [];
    for (;;) {
      const page = await d.readLedger(lines.at(-1)?.seq ?? state.seq);
      // The ledger went back past what the page holds: it is not the ledger the page folded.
      if (page.head < state.seq) return load();
      lines.push(...page.events);
      if (!page.more) break;
    }
    if (!apply(lines)) await load();
  }

  function sync(): Promise<void> {
    if (reading) {
      again = true;
      return reading;
    }
    reading = (async () => {
      try {
        do {
          again = false;
          await readOnce();
        } while (again);
      } finally {
        reading = null;
      }
    })();
    return reading;
  }

  return {
    get state() { return state; },
    load,
    sync,
    async own(line, board) {
      if (state && !reading && line.seq === state.seq + 1 && apply([answerEvent(state, board, line)])) return;
      await sync();
    },
    watch(failed, worked) {
      // A head past the one held, or no head (catch up on anything appended while not following).
      return hearUntilStopped<[BoardEvent]>((heard) => d.events(heard), ({ ref }) => { if (!state || ref.head === undefined || ref.head > state.seq) sync().then(worked, failed); });
    },
    settled: async () => { while (reading) await reading; },
  };
}
