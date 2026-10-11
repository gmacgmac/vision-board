// What the agent owes (D-020, api.md 36, 41), as the conditions table works it out
// (conditions.ts), and the person's responses since a cursor (`check_responses`). Pure reads of
// the folded ledger.
import type { ActEvent } from '../../format/src/index.ts';
import { isContainerAct } from '../../format/src/index.ts';
import { conditionsOf } from './conditions.ts';
import type { LedgerState } from './fold.ts';
import { numberOf } from './numbers.ts';
import { mayAnswer, mayAnswerIn } from './permissions.ts';
import { scopeOf } from './references.ts';
import { isAnswer } from './registry.ts';
import type { ReplyScope } from './reply.ts';

/** One item the agent owes an answer on, by its board number `n`. `ask`: the person's latest
 * comment or "needs context" that nothing answers yet. `later`: the `seq` of the "later" that has no
 * park bundle after it. A whole container's latest standing note (api.md 73) is owed with `region`
 * set and `n` 0, as its `Ask` is: it is on no card. */
export interface PendingItem {
  n: number;
  region?: string;
  ask?: { kind: 'comment' | 'context'; seq: number };
  later?: number;
}

/** Items on `board` the agent owes an answer on, by number, then its containers' notes in the
 * order the containers were first noted: the `item.owed` and `container.owed` conditions. With
 * `agent`, only the items and containers it may answer, so one agent is never told to answer
 * another's. An item owes its unanswered ask first, else its "later". */
export const pendingItems = (s: LedgerState, board: string, agent?: string): PendingItem[] =>
  conditionsOf(s, { board, agent }).flatMap((c) => {
    if (c.kind !== 'item.owed' && c.kind !== 'container.owed') return [];
    const ask = s.asks.get(c.seq!);
    return [{ n: c.id === undefined ? 0 : numberOf(s, c.id), ...(c.container !== undefined && { region: c.container }), ...(ask ? { ask: { kind: ask.kind, seq: c.seq! } } : { later: c.seq! }) }];
  });

/** Does this act concern `agent`? Send always; answers to its own requests and its own
 * removals; anything else in a container it may answer for, on any card it is on (api.md 41). */
function concerns(s: LedgerState, e: ActEvent, agent: string): boolean {
  // A note on or a place for a whole container: the agents that may answer on it (api.md 75).
  if (isContainerAct(e)) return mayAnswerIn(s, agent, { board: e.board!, region: e.region! });
  switch (e.action) {
    case 'send': return true;
    case 'grant': case 'deny': return s.index.requests.get(e.request!)?.agent === agent;
    case 'revoke': return e.holder === agent;
    case 'mode': case 'widths': return mayAnswerIn(s, agent, { board: e.board!, region: e.region! });
    default: return scopeOf(s, e).cards.some((id) => mayAnswer(s, agent, id));
  }
}

/** The person's acts on `board` after `seq` `after`, oldest first (`check_responses`), as the fold
 * holds them (cards by identity). With `agent`, only those that concern it, including the answers
 * to its grant requests. The person's flags are never among them (fold.ts keeps them out of
 * `acts`, api.md 128). */
export function responsesAfter(s: LedgerState, board: string, after: number, agent?: string): ActEvent[] {
  const out: ActEvent[] = [];
  for (const e of s.acts) {
    if (scopeOf(s, e).board !== board || (agent !== undefined && !concerns(s, e, agent))) continue;
    const shown = asReported(s, e, after);
    if (shown) out.push(shown);
  }
  return out;
}

/** The cards (by board number, as `replyText` reads them) and containers the person answered on `board` after `since`: an act on an item (✓,
 * ✗, a note, Later, Reopen, a note changed or removed, a proposal turned down) or a note on a whole
 * container, as `check_responses` reports them (with `agent`, only what concerns it). The round
 * Send hands the chat panel's agent (reply.ts `replyText`, panel-send ruling 1). */
export function replyScope(s: LedgerState, board: string, since: number, agent?: string): ReplyScope {
  const cards = new Set<number>();
  const regions = new Set<string>();
  for (const e of responsesAfter(s, board, since, agent)) {
    if (!isAnswer(e.action)) continue;
    for (const id of scopeOf(s, e).cards) cards.add(numberOf(s, id));
    if (isContainerAct(e)) regions.add(e.region!);
  }
  return { since, cards, regions };
}

/** How an act reads to an agent whose cursor is `after` (api.md 61). A note is its `comment` or
 * `context` act with the note's latest words and kind, shown again when it changed after the
 * cursor; a removed note is gone. Edits are folded into the note, so they never show on their
 * own; a removal shows only when the note itself is at or before the cursor (the agent may have
 * read it). Anything else shows as written, once. */
function asReported(s: LedgerState, e: ActEvent, after: number): ActEvent | undefined {
  if (e.action === 'note-edit') return undefined;
  if (e.action === 'note-remove') return e.seq > after && e.note! <= after ? e : undefined;
  const a = e.action === 'comment' || e.action === 'context' ? s.asks.get(e.seq) : undefined;
  if (!a) return e.seq > after ? e : undefined;
  if (a.removed !== undefined || (e.seq <= after && (a.changed ?? 0) <= after)) return undefined;
  return a.changed === undefined ? e : { ...e, action: a.kind, ...(a.text !== undefined && { text: a.text }) };
}
