// The ledger state the page holds, and how it stays current (N12_FE_01 ruling 2, performance.md
// approaches 1 and 5). Opening the page reads the whole ledger once (`read_ledger`, a full fetch,
// counted) and folds it with the shared action layer. After that every new line is applied to the
// same state: the host's change events (`host.events`, host.ts; on the standalone page its project
// stream, `watch_project`, followed from boot whether or not there are boards, FE_02 ruling 1) say a
// line was appended, the board reads only the lines after the last one it holds, and hands them on
// in one batch; an event with no head (a stream that opened again) reads whatever is new. An act the
// page sent itself is applied from its answer when it is the next line. A full fetch happens again
// only when the ledger went back (another project, a reset) or a line has a format the page cannot
// apply. Reloading the page (a rebuilt page, another folder) is the standalone host's (page-host.ts). Every read
// also says whether the ledger is open read-only (`readOnly`, D-085 4), so any host's board learns it from its reads;
// a change of it alone is handed on as an empty batch, so the board draws its controls again. A change event with
// head 0 says the ledger file was replaced (a git pull, a sync, D-085 6): the whole ledger is read again.
import type { LedgerEvent, LedgerLine } from '#format';
import type { LedgerState } from '#actions';
import { applyEvent, foldLedger } from '#actions';
import { canApply } from './board-data.ts';
import { answerEvent } from './card-numbers.ts';
import type { PluginEvent } from './host.ts';
import type { Io } from './io.ts';
import { hearUntilStopped } from './teardown.ts';
import { work } from './work.ts';

export interface Live {
  /** The held state; null until the first `load`. */
  readonly state: LedgerState | null;
  /** The ledger is open read-only, as the last read said (D-085 4). */
  readonly readOnly: boolean;
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
  events(listener: (e: PluginEvent) => void): () => void;
}

export function createLive(d: LiveDeps, onLines: OnLines): Live {
  let state: LedgerState | null = null;
  let reading: Promise<void> | null = null;
  let again = false;
  let readOnly = false;
  /** The next read is from the start: the file was replaced. */
  let fromZero = false;
  /** What a read said of read-only; true when that changed. */
  const heard = (page: { readOnly?: true }): boolean => {
    const was = readOnly;
    readOnly = page.readOnly === true;
    return was !== readOnly;
  };

  async function all(): Promise<LedgerEvent[]> {
    const out: LedgerEvent[] = [];
    for (;;) {
      const page = await d.readLedger(out.at(-1)?.seq ?? 0);
      heard(page);
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
    if (!state || fromZero) {
      fromZero = false;
      return load();
    }
    const lines: LedgerEvent[] = [];
    let flipped = false;
    for (;;) {
      const page = await d.readLedger(lines.at(-1)?.seq ?? state.seq);
      flipped = heard(page) || flipped;
      // The ledger went back past what the page holds: it is not the ledger the page folded.
      if (page.head < state.seq) return load();
      lines.push(...page.events);
      if (!page.more) break;
    }
    const fresh = lines.some((e) => e.seq > state!.seq);
    if (!apply(lines)) return load();
    if (flipped && !fresh) onLines([], false);
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
    get readOnly() { return readOnly; },
    load,
    sync,
    async own(line, board) {
      if (state && !reading && line.seq === state.seq + 1 && apply([answerEvent(state, board, line)])) return;
      await sync();
    },
    watch(failed, worked) {
      // A head past the one held, or no head (catch up on anything appended while not following).
      return hearUntilStopped<[PluginEvent]>((events) => d.events(events), ({ ref }) => {
        const head = typeof ref.head === 'number' && Number.isSafeInteger(ref.head) && ref.head >= 0 ? ref.head : undefined; // else a catch-up
        if (head === 0 && state) { fromZero = true; sync().then(worked, failed); } // the file was replaced: from the start
        else if (!state || head === undefined || head > state.seq) sync().then(worked, failed);
      });
    },
    settled: async () => { while (reading) await reading; },
  };
}
