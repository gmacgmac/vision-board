// The ledger state the page holds, and how it stays current (N12_FE_01 ruling 2, performance.md
// approaches 1 and 5). Opening the page reads the whole ledger once (`read_ledger`, a full fetch,
// counted) and folds it with the shared action layer. After that every new line is applied to the
// same state: the live stream (`watch_board`) says a line was appended, the page reads only the
// lines after the last one it holds, and hands them on in one batch. An act the page sent itself
// is applied from its answer when it is the next line. A full fetch happens again only when the
// ledger went back (another project, a reset) or a line has a format the page cannot apply.
import type { LedgerEvent } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { applyEvent, foldLedger } from '../../../../packages/actions/src/index.ts';
import { canApply } from './board-data.ts';
import { readLedger, watchBoard } from './io.ts';
import { work } from './work.ts';

export interface Live {
  /** The held state; null until the first `load`. */
  readonly state: LedgerState | null;
  /** Read and fold the whole ledger (a full fetch). */
  load(): Promise<void>;
  /** Read the lines after the held head and apply them. Calls made while a read is in flight
   * share one more read after it, so nothing appended in between is missed. */
  sync(): Promise<void>;
  /** An act the page sent: applied in place when it is the next line, else read with the rest. */
  own(e: LedgerEvent): Promise<void>;
  /** Follow board `id`'s live stream; a stop function. */
  watch(id: string): () => void;
  /** Resolves when no read is in flight. */
  settled(): Promise<void>;
}

/** `lines`: the batch applied in place; `full`: the state was read afresh, so draw from scratch. */
export type OnLines = (lines: LedgerEvent[], full: boolean) => void;

export function createLive(onLines: OnLines): Live {
  let state: LedgerState | null = null;
  let reading: Promise<void> | null = null;
  let again = false;

  async function all(): Promise<LedgerEvent[]> {
    const out: LedgerEvent[] = [];
    for (;;) {
      const page = await readLedger(out.at(-1)?.seq ?? 0);
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
      const page = await readLedger(lines.at(-1)?.seq ?? state.seq);
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
    async own(e) {
      if (state && !reading && e.seq === state.seq + 1 && apply([e])) return;
      await sync();
    },
    watch(id) {
      // On (re)connecting, catch up on anything appended while the stream was not open.
      return watchBoard(id, (seq) => { if (!state || seq > state.seq) void sync(); }, () => void sync());
    },
    settled: async () => { while (reading) await reading; },
  };
}
