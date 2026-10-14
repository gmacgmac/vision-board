// The open board's versions and the read-only past view (navigation FE_01 rulings 2-5, versionView
// flag). The toolbar's dropdown lists `boardVersions` (packages/actions reads.ts) from the live
// state after every batch and switch: "now" is the board's own head, so other boards and the
// person's board seen never move it. Choosing a past version reads the ledger from the start up to
// its line (read_ledger pages, stopping there; no contract change), folds it with the shared action
// layer, and the controller draws that state with the same drawing code. While it shows, the world
// carries data-readonly (board.css hides what acts), the stage's acting handlers do nothing
// (`guard`), sender.ts refuses every act and attention.ts sends no board seen; selection, zoom, pan
// and the finder still work. The live state keeps following the ledger underneath; new lines never
// redraw the past view, but the dropdown's "now" moves. Esc or "Back to now" ends it.
import type { LedgerEvent } from '../../../../packages/format/src/index.ts';
import type { BoardRun, LedgerState } from '../../../../packages/actions/src/index.ts';
import { boardVersions, foldLedger } from '../../../../packages/actions/src/index.ts';
import { readLedger } from './io.ts';
import type { StageHandlers } from './wiring.ts';
import { shell } from '../shell/shell.svelte.ts';

export interface VersionsDeps {
  world: HTMLElement;
  /** The versionView flag: off, nothing is listed and no past version can show. */
  on: boolean;
  live(): LedgerState | null;
  board(): string;
  /** Draw the open board from scratch: the past state while one shows, else now. */
  redraw(): void;
  fail(err: unknown): void;
}

export interface Versions {
  /** The past board's state while a past version shows, else null (the board is live). */
  readonly state: LedgerState | null;
  /** List the open board's versions again from the live state (after a batch or a switch). */
  listed(): void;
  /** Show the open board at version `seq`, or now with null. */
  show(seq: number | null): Promise<void>;
  /** Back to now without drawing (another board opens): the caller draws. */
  reset(): void;
  /** The stage's handlers, those that act doing nothing while a past version shows. */
  guard(h: StageHandlers): StageHandlers;
}

/** The stage handlers that lead to a person act: a review button or key, a proposal's answer, a
 * note, a size, a layout mode, a place, a move, access, a container's removal. The rest (selection,
 * lasso, view commands, Esc) stay. A locked board pauses the same ones but the flag (lock-flow.ts). */
export const ACTING = [
  'act', 'flag', 'answer', 'showNote', 'showReply', 'setSize', 'setMode', 'resetRegion', 'regionComment', 'putBack', 'removeRegion', 'revoke', 'pin', 'pinRegion',
  'frameStart', 'frameMove', 'frameEnd', 'regionCommand', 'unpin', 'dragStart', 'dragOver', 'drop',
] as const satisfies readonly (keyof StageHandlers)[];

/** The ledger from the start up to line `seq`, a page at a time, stopping once it is reached. */
async function linesTo(seq: number): Promise<LedgerEvent[]> {
  const out: LedgerEvent[] = [];
  let after = 0;
  for (;;) {
    const page = await readLedger(after);
    out.push(...page.events.filter((e) => e.seq <= seq));
    after = page.events.at(-1)?.seq ?? after;
    if (!page.more || after >= seq) return out;
  }
}

/** A version's time as the dropdown and the banner show it, in the person's own clock. */
export const versionTime = (at: string): string =>
  new Date(at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export function createVersions(d: VersionsDeps): Versions {
  let state: LedgerState | null = null;
  /** The latest request: a slower read for an earlier choice is dropped when it lands. */
  let asked = 0;

  function listed() {
    const s = d.live();
    if (!d.on) return;
    const v = s ? boardVersions(s, d.board()) : undefined;
    shell.version = v?.now ?? null;
    shell.versions = v?.past ?? [];
  }

  function set(past: { run: BoardRun; state: LedgerState } | null) {
    state = past?.state ?? null;
    shell.past = past?.run ?? null;
    d.world.toggleAttribute('data-readonly', past !== null);
  }

  return {
    get state() { return state; },
    listed,
    async show(seq) {
      const mine = ++asked;
      const run = shell.versions.find((r) => r.seq === seq);
      if (!run) {
        set(null);
        return d.redraw();
      }
      shell.loadingVersion = true;
      try {
        const lines = await linesTo(run.seq);
        if (mine !== asked) return;
        set({ run, state: foldLedger(lines) });
        d.redraw();
      } catch (err) {
        d.fail(err);
      } finally {
        if (mine === asked) shell.loadingVersion = false;
      }
    },
    reset() {
      asked += 1;
      shell.loadingVersion = false;
      set(null);
      listed();
    },
    guard(h) {
      const out: StageHandlers = { ...h, carried: (id) => (state ? [] : h.carried(id)) };
      for (const name of ACTING) {
        const fn = h[name] as ((...args: never[]) => void) | undefined;
        if (fn) Object.assign(out, { [name]: (...args: never[]) => (state ? undefined : fn(...args)) });
      }
      return out;
    },
  };
}
