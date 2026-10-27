// Who holds what (api.md 81-86, D-034): the keys the index keeps holders under, and the rules
// for a revoke and an open grant request, which the ledger and the action layer both ask.
import type { LedgerIndex } from './ledger-index.ts';
import * as formatLedgerWords from './words/format-ledger.ts';

/** One key per container (a region, D-011). Ids cannot contain `/`, so the key is unambiguous. */
export const containerKey = (board: string, region: string): string => `${board}/${region}`;

/** The key `creators` and `holders` use: the board's id for the whole board (no `region`), else
 * the container's `containerKey`. Board ids hold no `/`, so the two never meet. */
export const accessKey = (board: string, region?: string): string =>
  region === undefined ? board : containerKey(board, region);

/** How a problem names a board or a container. */
export const accessName = (board: string, region?: string): string => region === undefined ? formatLedgerWords.board(board) : `${board}/${region}`;

/** Why `holder` cannot be revoked from the board, or the container in `region`, or undefined when
 * it can: a creator stays, and only a holder can be removed (api.md 16, 82). The ledger and the
 * person's act check both ask here. */
export function revokeProblem(ix: LedgerIndex, board: string, region: string | undefined, holder: string): string | undefined {
  const k = accessKey(board, region);
  const what = accessName(board, region);
  if (ix.creators.get(k) === holder)
    return formatLedgerWords.holderCreatedAndAS(holder, what, region === undefined ? 'board' : 'container');
  if (!ix.holders.get(k)?.has(holder)) return formatLedgerWords.holderDoesNotHold(holder, what);
  return undefined;
}

/** The `seq` of `agent`'s unanswered grant request for the container, or with no `region` for
 * the board, if any (api.md 26). */
export function openRequestOf(ix: LedgerIndex, agent: string | undefined, board: string, region?: string): number | undefined {
  for (const [seq, r] of ix.requests) {
    if (!r.answer && r.agent === agent && r.board === board && r.region === region) return seq;
  }
  return undefined;
}
