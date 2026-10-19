// Each card's times (card-polish FE_03, maintainer point 20): while the ledger is folded, every card
// keeps a short list of when the few things the history box shows happened to it: first drawn and each
// version after (drawn vN), each note the person sent, each agent reply, ✓, ✗ and reopened, and its
// app allowed or stopped. Times only, never words: no note, reply or reason text is kept, and the
// person's private marks never reach it (fold.ts folds them before this). Lines are matched to cards
// and said by the history model (card-history.ts `cardsAbout`, `saidOf`, `historyRow`), so the box and
// `cardHistory` never disagree. The page reads it from the state it already holds: no ledger read. Pure.
import type { LedgerEvent } from '../../format/src/index.ts';
import { appCards } from './apps.ts';
import type { HistoryKind, HistoryRow, Lookup } from './card-history.ts';
import { cardsAbout, historyRow, noteNumbers, saidOf } from './card-history.ts';
import type { LedgerState } from './fold.ts';

/** The kinds a card's times keep: the history box's rows (maintainer, 2026-10-19, point 20). */
export const TIME_KINDS: ReadonlySet<HistoryKind> = new Set<HistoryKind>([
  'drawn', 'note-sent', 'replied', 'check', 'cross', 'reopened', 'app-allowed', 'app-stopped',
]);

/** The kinds an agent's line makes; the rest are the person's. */
const AGENT_KINDS: ReadonlySet<HistoryKind> = new Set<HistoryKind>(['drawn', 'replied']);

/** One thing that happened to a card, without words: the line's `seq` and time, what it was, the
 * version drawn, the `seq` of the note it sent or replied to, how many cards a group note is on, and
 * the agent's id on an agent's line. A reply row's reply is its own `seq`. */
export interface CardTime { seq: number; at: string; kind: HistoryKind; ver?: number; note?: number; cards?: number; agent?: string }

/** Card id -> its times, oldest first. */
export type CardTimes = Map<number, CardTime[]>;

/** Fold one line, after the rest of the fold took it (the note a reply names is known by then). */
export function foldCardTimes(s: LedgerState, e: LedgerEvent): void {
  const look: Lookup = { ask: (seq) => s.asks.get(seq), appCards: (app) => appCards(s, app) };
  const cards = cardsAbout(e, look);
  const d = cards.length > 0 ? saidOf(e, look) : undefined;
  if (!d || !TIME_KINDS.has(d.kind)) return;
  const t: CardTime = {
    seq: e.seq, at: e.at, kind: d.kind, ...(d.ver !== undefined && { ver: d.ver }), ...(d.note !== undefined && { note: d.note }),
    ...(d.cards !== undefined && { cards: d.cards }), ...(e.by === 'agent' && e.agent !== undefined && { agent: e.agent }),
  };
  for (const id of cards) {
    const list = s.times.get(id);
    if (list) list.push(t);
    else s.times.set(id, [t]);
  }
}

/** Card `id`'s times as history rows, newest first, in `cardHistory`'s words: notes numbered as the
 * card numbers them now, agents by their labels. */
export function cardTimeRows(s: LedgerState, id: number): HistoryRow[] {
  const numbers = noteNumbers(s.logs.get(id)?.asks ?? []);
  return (s.times.get(id) ?? []).map((t) => historyRow(
    { seq: t.seq, at: t.at, by: AGENT_KINDS.has(t.kind) ? 'agent' : 'person', ...(t.agent !== undefined && { agent: t.agent }) },
    t, numbers, s.agents,
  )).reverse();
}
