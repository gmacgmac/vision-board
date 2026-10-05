// What the agent owes and what the person has not seen yet (D-018, D-020, api.md 36, 41), and
// the person's responses since a cursor (`check_responses`). Pure reads of the folded ledger.
import type { ActEvent, LedgerNode } from '../../format/src/index.ts';
import { latest, nodesOf } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { canWrite, holders } from './grants.ts';
import { DECIDED } from './registry.ts';

/** One item the agent owes an answer on. `ask`: the person's latest comment or "needs context"
 * that nothing answers yet. `later`: the `seq` of the "later" that has no park bundle after it. */
export interface PendingItem {
  n: number;
  ask?: { kind: 'comment' | 'context'; seq: number };
  later?: number;
}

/** An agent may answer node `n` when it holds the node's container or wrote its latest version
 * (api.md 24); that is also what it is told it owes (api.md 41). */
const mayAnswer = (s: LedgerState, agent: string, n: number) => canWrite(s, agent, { type: 'reply', n }) === 'ok';

/** Items on `board` the agent owes an answer on, by number. With `agent`, only the items it may
 * answer, so one agent is never told to answer another's items. A decided item owes nothing. */
export function pendingItems(s: LedgerState, board: string, agent?: string): PendingItem[] {
  const out: PendingItem[] = [];
  for (const node of nodesOf(s, board)) {
    if (!latest(node).item || (agent !== undefined && !mayAnswer(s, agent, node.n))) continue;
    const owed = owedOn(s, node);
    if (owed) out.push(owed);
  }
  return out.sort((a, b) => a.n - b.n);
}

function owedOn(s: LedgerState, node: LedgerNode): PendingItem | undefined {
  const status = s.items.get(node.n)?.status ?? 'open';
  const m = s.marks.get(node.n);
  if (!m || DECIDED.has(status)) return undefined;
  const { ask } = m;
  const answered = ask && (latest(node).ver > ask.ver || (s.replies.get(node.n) ?? []).some((r) => r.to === ask.seq));
  const parkOwed = status === 'later' && m.later !== undefined && (m.park ?? 0) < m.later;
  if ((!ask || answered) && !parkOwed) return undefined;
  return {
    n: node.n,
    ...(ask && !answered && { ask: { kind: ask.kind, seq: ask.seq } }),
    ...(parkOwed && { later: m.later }),
  };
}

/** An item whose latest version is newer than the one the person last saw (D-018). */
export interface UnseenItem { n: number; ver: number; seen: number }

/** Items on `board` with a version the person has not seen; `seen` is 0 when never seen. */
export function unseenItems(s: LedgerState, board: string): UnseenItem[] {
  const out: UnseenItem[] = [];
  for (const node of nodesOf(s, board)) {
    const v = latest(node);
    const seen = s.seen.get(node.n) ?? 0;
    if (v.item && v.ver > seen) out.push({ n: node.n, ver: v.ver, seen });
  }
  return out.sort((a, b) => a.n - b.n);
}

/** The board an act belongs to: its node's, its request's, or the one it names. */
function boardOf(s: LedgerState, e: ActEvent): string | undefined {
  if (e.n !== undefined) return s.nodes.get(e.n)?.board;
  if (e.action === 'grant' || e.action === 'deny') return s.index.requests.get(e.request!)?.board;
  return e.board;
}

/** Does this act concern `agent`? Send always; answers to its own requests and its own
 * removals; anything else in a container it may answer for (api.md 41). */
function concerns(s: LedgerState, e: ActEvent, agent: string): boolean {
  switch (e.action) {
    case 'send': return true;
    case 'grant': case 'deny': return s.index.requests.get(e.request!)?.agent === agent;
    case 'revoke': return e.holder === agent;
    case 'mode': return holders(s, e.board!, e.region!).includes(agent);
    default: return e.n !== undefined && mayAnswer(s, agent, e.n);
  }
}

/** The person's acts on `board` after `seq` `after`, oldest first (`check_responses`). With
 * `agent`, only those that concern it, including the answers to its grant requests. */
export function responsesAfter(s: LedgerState, board: string, after: number, agent?: string): ActEvent[] {
  return s.acts.filter((e) =>
    e.seq > after && boardOf(s, e) === board && (agent === undefined || concerns(s, e, agent)));
}
