// Retiring cards (ruling 1, assumptions B and C, api.md 126-127): which cards a `retire` takes,
// why it is refused while one of them still owes the person something, and its fold. A retired
// card leaves the board (format's `nodesOf` and `boardView` leave it out) and keeps its history
// and number; its open proposals end `closed`; a retired container is kept as it was, so
// `show_container` still answers. Pure.
import type { RetireEvent } from '../../format/src/index.ts';
import { containerKey, nodesOf } from '../../format/src/index.ts';
import { owedOn, replied } from './conditions.ts';
import type { LedgerState } from './fold.ts';
import { latestAsk } from './notes.ts';
import { numberOf } from './numbers.ts';
import { endProposal } from './proposals.ts';
import { placeOf } from './references.ts';

/** What a retire item names: one card (its identity), or a whole container on `board`. */
export type RetireTarget = { board: string; id: number } | { board: string; region: string };

/** The cards a retire takes, by identity in card order: the card named, or every card on the
 * board now whose place (the person's moves count) is the container. */
export function retireCards(s: LedgerState, t: RetireTarget): number[] {
  if ('id' in t) return [t.id];
  return nodesOf(s, t.board).filter((x) => placeOf(s, x.id)?.region === t.region).map((x) => x.id);
}

/** What card `id` still owes the person, as words with what to do, or undefined (`item.owed`). */
function owedWords(s: LedgerState, id: number): string | undefined {
  const node = s.nodes.get(id);
  const seq = node && owedOn(s, node);
  if (seq === undefined) return undefined;
  const card = `card ${numberOf(s, id)}`;
  const kind = s.asks.get(seq)?.kind;
  if (kind === 'comment') return `${card} has a comment you haven't answered: answer it with a reply or an append first`;
  if (kind === 'context') return `${card} asks for more context you haven't given: answer it with a reply or an append first`;
  return `${card} is saved for later and its handover isn't written: write it with a park first`;
}

/** Why the retire can't go yet, or undefined: a card it takes, or the container it names, still
 * owes the person an answer or a handover (assumption B: nothing the person asked for goes missing). */
export function retireProblem(s: LedgerState, t: RetireTarget, cards: readonly number[]): string | undefined {
  for (const id of cards) {
    const why = owedWords(s, id);
    if (why) return why;
  }
  if (!('region' in t)) return undefined;
  const ask = latestAsk(s.regionLogs.get(t.board)?.get(t.region) ?? { asks: [], decisions: [] });
  return ask && !replied(s, ask.seq, [])
    ? `container "${t.region}" has a note you haven't answered: answer it with a reply naming it first`
    : undefined;
}

/** Before a container's retire line is drawn: keep the container as it was (`show_container`). */
export function keepRetiredRegion(s: LedgerState, e: RetireEvent): void {
  const r = e.region === undefined ? undefined : s.boards.get(e.board)?.regions.find((x) => x.id === e.region);
  if (r) s.retiredRegions.set(containerKey(e.board, r.id), { region: r, seq: e.seq });
}

/** Fold a retire: every open proposal on a card it took ends, `closed` (api.md 127). */
export function foldRetire(s: LedgerState, e: RetireEvent): void {
  const gone = new Set(e.cards);
  for (const p of s.proposals.values()) if (gone.has(p.id)) endProposal(p, e.seq, 'closed');
}

