// The "N cards retired" markers on the page (retiredMarker flag; field report batch 2 ruling 1,
// api.md 126). A card the agent retired one at a time (a `retire` line with no `region`) leaves the
// board but not the ledger; the container it was in shows how many left it, and a press opens the
// board version where they last appeared: the latest one before the latest such line, with the
// person's answers as they stood just before the first retire after it (review polish ruling 10,
// N42; `pastLines`). A card's
// container is where it was when it was retired: no move, pin or version can follow a retire, so the
// person's last move of it, else the container its last version names, is its place at `seq - 1`
// (not `placeOf`, which falls back to the drawn container once the one it was moved into is gone). A
// whole container retired takes its cards and its frame with it, so it shows no marker; nor does a
// container retired later. The same version is where going to a retired card by its number offers
// to open (`lastShown`, go-to-card.ts). Pure: the held state in.
import type { LedgerEvent } from '../../../../packages/format/src/index.ts';
import { containerKey, everyNodeOf, LATER_REGION, latest } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { DRAWING_EVENTS } from '../../../../packages/actions/src/index.ts';

/** One container's marker: how many cards were retired from it, the board version (a run's `seq`)
 * that last showed the latest of them, when there is one, and with it `until`, the first `retire`
 * line on the board after that version: its past view folds the person's acts up to just before it. */
export interface RetiredCount { count: number; version?: number; until?: number }

/** The `seq` of every `retire` line that took a whole container off `board`. */
const containerRetires = (s: LedgerState, board: string): Set<number> =>
  new Set([...s.retiredRegions].filter(([key, r]) => key === containerKey(board, r.region.id)).map(([, r]) => r.seq));

/** The `seq` of every `retire` line on `board`, a card's or a whole container's, the agent's or the
 * person's, oldest first. */
const retireLines = (s: LedgerState, board: string, whole: ReadonlySet<number>): number[] =>
  [...new Set([...whole, ...everyNodeOf(s, board).flatMap((x) => (x.retired === undefined ? [] : [x.retired]))])].sort((a, b) => a - b);

/** Container id -> its marker, for the containers on `board` now that cards were retired from.
 * `versions`: past versions can show (the versionView flag); without, no marker opens one. */
export function retiredCounts(s: LedgerState, board: string, versions = true): Map<string, RetiredCount> {
  const on = s.index.boards.get(board) ?? new Set<string>();
  const whole = containerRetires(s, board);
  const found = new Map<string, { count: number; last: number }>();
  for (const x of everyNodeOf(s, board)) {
    if (x.retired === undefined || whole.has(x.retired)) continue;
    const region = s.moves.get(x.id) ?? latest(x).region;
    if (!on.has(region) && region !== LATER_REGION) continue;
    const was = found.get(region);
    found.set(region, { count: (was?.count ?? 0) + 1, last: Math.max(was?.last ?? 0, x.retired) });
  }
  const retires = retireLines(s, board, whole);
  return new Map([...found].map(([region, { count, last }]) => [region, { count, ...(versions && lastShown(s, board, last, retires)) }]));
}

/** The board version (a run's `seq`) that last showed a card retired at line `retired`, and with it
 * `until`, the first `retire` line on the board after that version; empty when no version came
 * before. The marker opens it, and so does going to a retired card by its number (go-to-card.ts). */
export function lastShown(s: LedgerState, board: string, retired: number,
  retires = retireLines(s, board, containerRetires(s, board))): Pick<RetiredCount, 'version' | 'until'> {
  const version = (s.runs.get(board) ?? []).filter((r) => r.seq < retired).at(-1)?.seq;
  const until = version === undefined ? undefined : retires.find((seq) => seq > version);
  return { ...(version !== undefined && { version }), ...(until !== undefined && { until }) };
}

/** A drawing line's board: its own, or for a link the board of the card it starts from. */
const drawnOn = (e: LedgerEvent, boardOf: ReadonlyMap<number, string>): string | undefined =>
  e.type === 'link' || e.type === 'unlink' ? boardOf.get(e.from) : 'board' in e ? e.board : undefined;

/** The ledger lines a marker's past view folds (ruling 10, N42): every line before `until` but
 * `board`'s drawing lines (`DRAWING_EVENTS`) after `version`. So the cards are exactly that
 * version's, and the person's answers, notes and moves, and the agent's replies that cleared a
 * card (D-045), are as they stood just before the retire. `events` run from the start, in order. */
export function pastLines(events: readonly LedgerEvent[], board: string, version: number, until: number): LedgerEvent[] {
  const boardOf = new Map<number, string>();
  return events.filter((e) => {
    if (e.type === 'node') boardOf.set(e.id, e.board);
    if (e.seq >= until) return false;
    return e.seq <= version || !DRAWING_EVENTS.has(e.type) || drawnOn(e, boardOf) !== board;
  });
}
