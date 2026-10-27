// Boards, containers and write grants (D-027, D-034, api.md 23, 26, 81-86). Who holds a board or a
// container and what the agents have asked for; whether one agent may write one item is the
// permissions table (permissions.ts). All of it reads the access index that packages/format folds
// (`LedgerState.index`); nothing is folded twice. Pure.
import { accessKey } from '#format';
import type { LedgerState } from './fold.ts';

/** The agents that hold a container now, or with no `region` the board (api.md 23, 81). A region
 * or board written by a v2 line has none. */
export function holders(s: LedgerState, board: string, region?: string): string[] {
  return [...(s.index.holders.get(accessKey(board, region)) ?? [])];
}

/** The agent whose v3 line created the container, or with no `region` the board, if any. */
export const creatorOf = (s: LedgerState, board: string, region?: string): string | undefined =>
  s.index.creators.get(accessKey(board, region));

/** One grant request: for `region` on `board`, or with no `region` for the whole board. */
export interface GrantRequestView {
  seq: number;
  board: string;
  region?: string;
  agent?: string;
  reason: string;
  at: string;
  /** The person's answer: `seq` of the `grant` or `deny` act, and a refusal's note. */
  answer?: { action: 'grant' | 'deny'; seq: number; text?: string };
}

/** Every grant request, oldest first, optionally on one board. The ledger refuses a repeat of an
 * open request (api.md 26), so the person is asked once. */
export function grantRequests(s: LedgerState, board?: string): GrantRequestView[] {
  const out: GrantRequestView[] = [];
  for (const [seq, note] of s.grantNotes) {
    const r = s.index.requests.get(seq);
    if (!r || (board !== undefined && r.board !== board)) continue;
    out.push({
      seq, board: r.board, ...(r.region !== undefined && { region: r.region }), reason: note.reason, at: note.at,
      ...(r.agent !== undefined && { agent: r.agent }),
      ...(r.answer && { answer: { ...r.answer, ...(note.text !== undefined && { text: note.text }) } }),
    });
  }
  return out;
}
