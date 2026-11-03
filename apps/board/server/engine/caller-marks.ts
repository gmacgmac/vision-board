// What a read tells its caller about itself (bot-quality TOOLS_01, the `botToolRules` flag), so a bot never has to
// work it out: each note the caller owes an answer (`owed`), from the condition rows `list_open`'s `pending` and
// `containers` read (`item.owed`, `container.owed`, scoped to the agent: one rule), and each board it holds (`held`),
// by the test `request_grant` answers `held` by (`holders`). Only an agent caller is marked: a read with no agent (the
// person, a client with no secret) has no "you", and is as before. Flag off, nothing is marked either. A note not owed
// says what answered it (`answered`, bot-quality TOOLS_02), by the rule that ends owing (`#actions` `noteAnswer`), so
// "answered" is read, never inferred from a missing `owed`.
import type { FlagOverrides } from '#format';
import { flagOn } from '#format';
import type { LedgerState, NoteAnswer } from '#actions';
import { conditionsOf, holders, noteAnswer, numberOf } from '#actions';
import { cardOn } from '../edge.ts';
import type { OpCtx } from './operations.ts';

/** A note as the reads give it: `seq` names it. */
interface Note { seq: number; owed?: true; answered?: NoteAnswer }

/** The notes owed on one board, by the card's board number and by region; what answered a note (`seq`) as card `n`
 * shows it, or as its container does with no `n`; and whether the caller holds the board. */
export interface CallerMarks {
  cards: Map<number, number>; regions: Map<string, number>; held: boolean;
  answered: (seq: number, n?: number) => NoteAnswer | undefined;
}

/** The agent a read is for, if any. */
const agentOf = (caller: OpCtx['caller']): string | undefined => (caller?.by === 'agent' ? caller.agent : undefined);

/** True when `caller` holds `board` itself (not only a container on it). */
export const holds = (s: LedgerState, board: string, caller: OpCtx['caller']): boolean => {
  const agent = agentOf(caller);
  return agent !== undefined && holders(s, board).includes(agent);
};

/** The marks for `caller` on `board`, or undefined with the flag off or no agent caller. */
export function marksFor(s: LedgerState, board: string, caller: OpCtx['caller'], flags: FlagOverrides): CallerMarks | undefined {
  const agent = agentOf(caller);
  if (agent === undefined || !flagOn('botToolRules', flags)) return undefined;
  const cards = new Map<number, number>();
  const regions = new Map<string, number>();
  for (const c of conditionsOf(s, { board, agent })) {
    if (c.kind === 'item.owed') cards.set(numberOf(s, c.id!), c.seq!);
    if (c.kind === 'container.owed') regions.set(c.container!, c.seq!);
  }
  const answered = (seq: number, n?: number): NoteAnswer | undefined => {
    const ask = s.asks.get(seq);
    return ask && noteAnswer(s, ask, n === undefined ? undefined : cardOn(s, board, n));
  };
  return { cards, regions, held: holds(s, board, caller), answered };
}

/** `notes` with `owed: true` on the one whose `seq` is `owed`, and `answered` on each other one something answered. */
const markNotes = <T extends Note>(notes: readonly T[], owed: number | undefined, answered: (seq: number) => NoteAnswer | undefined): T[] =>
  notes.map((x) => {
    if (owed !== undefined && x.seq === owed) return { ...x, owed: true as const };
    const a = answered(x.seq);
    return a ? { ...x, answered: a } : x;
  });

/** Container `region`'s own notes (`get_board`'s `containerNotes`, `show_container`'s `notes`), marked. */
export const markRegionNotes = <T extends Note>(notes: readonly T[], m: CallerMarks, region: string): T[] =>
  markNotes(notes, m.regions.get(region), (seq) => m.answered(seq));

/** A card's detail (`show_node`, `show_container`'s `nodes`) with its notes marked. */
export const markDetail = <T extends { n: number; notes: Note[] }>(d: T, m: CallerMarks | undefined): T =>
  (m ? { ...d, notes: markNotes(d.notes, m.cards.get(d.n), (seq) => m.answered(seq, d.n)) } : d);

/** `get_board`'s answer with its notes marked and `held` when the caller holds the board. */
export function markBoard<T extends { state: { items: Record<string, { notes: Note[] }>; containerNotes?: Record<string, Note[]> } }>(
  b: T, m: CallerMarks | undefined,
): T {
  if (!m) return b;
  const items = Object.fromEntries(Object.entries(b.state.items).map(([n, item]) => [n, { ...item, notes: markNotes(item.notes, m.cards.get(Number(n)), (seq) => m.answered(seq, Number(n))) }]));
  const notes = b.state.containerNotes;
  const containerNotes = notes && Object.fromEntries(Object.entries(notes).map(([r, list]) => [r, markRegionNotes(list, m, r)]));
  return { ...b, state: { ...b.state, items, ...(containerNotes && { containerNotes }) }, ...(m.held && { held: true as const }) };
}
