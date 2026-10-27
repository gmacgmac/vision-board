// Retiring cards (ruling 1, assumptions B and C, api.md 126-127): which cards a `retire` takes,
// why it is refused while one of them still owes the person something, and its fold. A retired
// card leaves the board (format's `nodesOf` and `boardView` leave it out) and keeps its history
// and number; its open proposals end `closed`; a retired container is kept as it was, so
// `show_container` still answers. The person retires too (N24, api.md 141): the same line, by the
// person, who may remove a card still owed an answer (ruling 3) and is warned first
// (`owedNotice`); nothing on it is owed after, and an answer on it waits for no Send. Pure.
import type { RetireEvent } from '#format';
import { containerKey, nodesOf } from '#format';
import { owedOn, replied } from './conditions.ts';
import type { LedgerState } from './fold.ts';
import { latestAsk } from './notes.ts';
import { numberOf } from './numbers.ts';
import { endProposal } from './proposals.ts';
import { placeOf } from './references.ts';
import { dropRetired } from './unsent.ts';

/** What a retire item names: one card (its identity), or a whole container on `board`. */
export type RetireTarget = { board: string; id: number } | { board: string; region: string };

/** The cards a retire takes, by identity in card order: the card named, or every card on the
 * board now whose place (the person's moves count) is the container. */
export function retireCards(s: LedgerState, t: RetireTarget): number[] {
  if ('id' in t) return [t.id];
  return nodesOf(s, t.board).filter((x) => placeOf(s, x.id)?.region === t.region).map((x) => x.id);
}

/** What card `id` still owes the person (`item.owed`): an unanswered note (an old More context is
 * one, D-045) or a Later with no handover; undefined when nothing. */
function owedKind(s: LedgerState, id: number): 'comment' | 'later' | undefined {
  const node = s.nodes.get(id);
  const seq = node && owedOn(s, node);
  return seq === undefined ? undefined : s.asks.has(seq) ? 'comment' : 'later';
}

/** What card `id` still owes the person, as words to the agent with what to do, or undefined. */
function owedWords(s: LedgerState, id: number): string | undefined {
  const kind = owedKind(s, id);
  const card = `card ${numberOf(s, id)}`;
  if (kind === 'comment') return `${card} has a comment you haven't answered: answer it with a reply or an append first`;
  return kind && `${card} is saved for later and its handover isn't written: write it with a park first`;
}

/** The latest note on container `t.region` with no reply naming it, if there is one. */
function owedRegionNote(s: LedgerState, t: { board: string; region: string }) {
  const ask = latestAsk(s.regionLogs.get(t.board)?.get(t.region) ?? { asks: [], decisions: [] });
  return ask && !replied(s, ask.seq, []) ? ask : undefined;
}

/** Why the retire can't go yet, or undefined: a card it takes, or the container it names, still
 * owes the person an answer or a handover (assumption B: nothing the person asked for goes missing). */
export function retireProblem(s: LedgerState, t: RetireTarget, cards: readonly number[]): string | undefined {
  for (const id of cards) {
    const why = owedWords(s, id);
    if (why) return why;
  }
  if (!('region' in t)) return undefined;
  return owedRegionNote(s, t) ? `container "${t.region}" has a note you haven't answered: answer it with a reply naming it first` : undefined;
}

const NOTICE = {
  comment: 'still has an unanswered comment',
  later: 'is saved for later and its handover isn\'t written yet',
} as const;

/** Up to this many cards still owed an answer are named one sentence each; more read as one. */
const NAMED = 3;

/** What the person is warned of before removing `cards` (N24 ruling 3, the confirm): one sentence
 * per card still owed an answer, by board number ("Card 4 still has an unanswered comment."), or with
 * more than three one sentence naming the first three ("Cards 4, 7, 9 and 2 more are still owed an
 * answer."), then the container's own unanswered note when a container goes (`title` names it).
 * Empty when nothing is owed. */
export function owedNotice(s: LedgerState, t: RetireTarget, cards: readonly number[], title?: string): string[] {
  const owed = cards.flatMap((id) => {
    const kind = owedKind(s, id);
    return kind ? [{ n: numberOf(s, id), kind }] : [];
  });
  const out = owed.length > NAMED
    ? [`Cards ${owed.slice(0, NAMED).map((x) => x.n).join(', ')} and ${owed.length - NAMED} more are still owed an answer.`]
    : owed.map((x) => `Card ${x.n} ${NOTICE[x.kind]}.`);
  const note = 'region' in t ? owedRegionNote(s, t) : undefined;
  // Any note reads as a note, an old More context too (D-045).
  if (note) out.push(`Container '${title ?? (t as { region: string }).region}' ${NOTICE.comment}.`);
  return out;
}

/** Before a container's retire line is drawn: keep the container as it was (`show_container`). */
export function keepRetiredRegion(s: LedgerState, e: RetireEvent): void {
  const r = e.region === undefined ? undefined : s.boards.get(e.board)?.regions.find((x) => x.id === e.region);
  if (r) s.retiredRegions.set(containerKey(e.board, r.id), { region: r, seq: e.seq });
}

/** Fold a retire: every open proposal on a card it took ends, `closed` (api.md 127), and an answer on
 * the cards waits for no Send (unsent.ts). */
export function foldRetire(s: LedgerState, e: RetireEvent): void {
  const gone = new Set(e.cards);
  for (const p of s.proposals.values()) if (gone.has(p.id)) endProposal(p, e.seq, 'closed');
  dropRetired(s, e);
}

