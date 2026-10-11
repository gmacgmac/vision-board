// The "N cards retired" markers on the page (retiredMarker flag; field report batch 2 ruling 1,
// api.md 126). A card the agent retired one at a time (a `retire` line with no `region`) leaves the
// board but not the ledger; the container it was in shows how many left it, and a press opens the
// board version where they last appeared: the latest one before the latest such line. A card's
// container is where it was when it was retired: no move, pin or version can follow a retire, so the
// person's last move of it, else the container its last version names, is its place at `seq - 1`
// (not `placeOf`, which falls back to the drawn container once the one it was moved into is gone). A
// whole container retired takes its cards and its frame with it, so it shows no marker; nor does a
// container retired later. Pure: the held state in.
import { containerKey, everyNodeOf, LATER_REGION, latest } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';

/** One container's marker: how many cards were retired from it, and the board version (a run's
 * `seq`) that last showed the latest of them, when there is one. */
export interface RetiredCount { count: number; version?: number }

/** The `seq` of every `retire` line that took a whole container off `board`. */
const containerRetires = (s: LedgerState, board: string): Set<number> =>
  new Set([...s.retiredRegions].filter(([key, r]) => key === containerKey(board, r.region.id)).map(([, r]) => r.seq));

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
  const runs = s.runs.get(board) ?? [];
  return new Map([...found].map(([region, { count, last }]) => {
    const version = versions ? runs.filter((r) => r.seq < last).at(-1)?.seq : undefined;
    return [region, { count, ...(version !== undefined && { version }) }];
  }));
}
