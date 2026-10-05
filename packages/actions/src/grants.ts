// Containers and write grants (D-027, api.md 23-26). Who holds a container, what the agents have
// asked for, and whether one agent may write one item. All of it reads the container index that
// packages/format folds (`LedgerState.index`); nothing is folded twice. Pure.
import type { LedgerIndex } from '../../format/src/index.ts';
import { containerKey, latest } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';

/** One container: a region on a board (D-011). */
export interface Container { board: string; region: string }

/** The agents that hold a container now: its creator plus every grant, minus revocations
 * (api.md 23). A region written by a v2 line has none. */
export function holders(s: LedgerState, board: string, region: string): string[] {
  return [...(s.index.holders.get(containerKey(board, region)) ?? [])];
}

/** The agent whose v3 line created the container, if any. */
export const creatorOf = (s: LedgerState, board: string, region: string): string | undefined =>
  s.index.creators.get(containerKey(board, region));

const holds = (ix: LedgerIndex, agent: string, c: Container) =>
  ix.holders.get(containerKey(c.board, c.region))?.has(agent) ?? false;

export interface GrantRequestView extends Container {
  seq: number;
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
      seq, board: r.board, region: r.region, reason: note.reason, at: note.at,
      ...(r.agent !== undefined && { agent: r.agent }),
      ...(r.answer && { answer: { ...r.answer, ...(note.text !== undefined && { text: note.text }) } }),
    });
  }
  return out;
}

/** The unanswered request `seq`, or undefined. */
export function openRequest(s: LedgerState, seq: number): GrantRequestView | undefined {
  const r = grantRequests(s).find((x) => x.seq === seq);
  return r && !r.answer ? r : undefined;
}

/** One write item as the server holds it after resolving it: keys turned into numbers, the board
 * taken from the path (api.md 34, 35). Full ledger events fit this shape too. */
export type WriteItem =
  | { type: 'board'; board: string }
  | { type: 'region'; board: string; region: { id: string } }
  | { type: 'node'; board: string; n: number; node: { region: string } }
  | { type: 'link' | 'unlink'; from: number; to: number }
  | { type: 'reply' | 'propose' | 'park'; n: number };

/** May `agent` write `item`? `'ok'`, or the container it must be granted first (api.md 24, 25).
 * Only containers that exist are judged: an unknown board, region or node is left to the context
 * check, so the agent is told what is wrong rather than to ask for a grant it cannot get. */
export function canWrite(s: LedgerState, agent: string, item: WriteItem): 'ok' | Container {
  const exists = (c: Container) => s.index.boards.get(c.board)?.has(c.region) ?? false;
  const need = (c: Container | undefined) => (c && exists(c) && !holds(s.index, agent, c) ? c : undefined);
  /** The container a node is in now (api.md 24): where the person put it (moves.ts), else where
   * the agent drew it. The built-in Later has no holders, so a card there is judged by the
   * container its agent drew it in. */
  const placeOf = (n: number): Container | undefined => {
    const x = s.nodes.get(n);
    if (!x) return undefined;
    const moved = s.moves.get(n);
    const here = moved !== undefined && exists({ board: x.board, region: moved }) ? moved : latest(x).region;
    return { board: x.board, region: here };
  };
  switch (item.type) {
    case 'board': return 'ok';
    case 'region': return need({ board: item.board, region: item.region.id }) ?? 'ok';
    case 'node': {
      const target = { board: item.board, region: item.node.region };
      const now = placeOf(item.n);
      if (!now) return need(target) ?? 'ok';
      const moves = now.board !== target.board || now.region !== target.region;
      return need(now) ?? (moves ? need(target) : undefined) ?? 'ok';
    }
    case 'link': case 'unlink': return need(placeOf(item.from)) ?? 'ok';
    default: {
      const x = s.nodes.get(item.n);
      if (!x || latest(x).agent === agent) return 'ok';
      return need(placeOf(item.n)) ?? 'ok';
    }
  }
}
