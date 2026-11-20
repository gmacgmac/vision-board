// What a read tells its caller about itself (bot-quality TOOLS_01, the `botToolRules` flag), so a bot never has to
// work it out: each note the caller owes an answer (`owed`), from the condition rows `list_open`'s `pending` and
// `containers` read (`item.owed`, `container.owed`, scoped to the agent: one rule), and each board it holds (`held`),
// by the test `request_grant` answers `held` by (`holders`), and each container it may write in (`held` too), by the rule a
// write into it goes through (`#actions` `mayAnswerIn`, the `region` row of `PERMISSIONS`; api.md 212). Only an agent
// caller is marked: a read with no agent (the person, a client with no secret) has no "you", and is as before. Flag off,
// nothing is marked either. The folder's one agent (`singleAgent`, plugin.md § The bot) is marked unscoped: every note an
// agent owes is `owed`, every board and container `held`. A note not owed
// says what answered it (`answered`, bot-quality TOOLS_02), by the rule that ends owing (`#actions` `noteAnswer`), so
// "answered" is read, never inferred from a missing `owed`.
import type { FlagOverrides } from '#format';
import { flagOn } from '#format';
import type { LedgerState, NoteAnswer } from '#actions';
import { conditionsOf, holders, mayAnswerIn, noteAnswer, numberOf } from '#actions';
import { cardOn } from '../edge.ts';
import type { OpCtx } from './operations.ts';
import { scopeOf } from './operations.ts';

/** A note as the reads give it: `seq` names it. */
interface Note { seq: number; owed?: true; answered?: NoteAnswer }

/** The notes owed on one board, by the card's board number and by region; what answered a note (`seq`) as card `n`
 * shows it, or as its container does with no `n`; whether the caller holds the board; and whether it may write in
 * container `region` (`heldIn`). */
export interface CallerMarks {
  cards: Map<number, number>; regions: Map<string, number>; held: boolean;
  answered: (seq: number, n?: number) => NoteAnswer | undefined;
  heldIn: (region: string) => boolean;
}

/** Who a read is for: the caller, and whether it is the folder's one agent. */
type Reader = Pick<OpCtx, 'caller' | 'one'>;

/** True when the agent caller holds `board` itself (not only a container on it); the folder's one agent holds every board. */
export const holds = (s: LedgerState, board: string, who: Reader): boolean => {
  if (who.caller?.by !== 'agent') return false;
  const agent = scopeOf(who);
  return agent === undefined || holders(s, board).includes(agent);
};

/** The marks for the caller on `board`, or undefined with the flag off or no agent caller. */
export function marksFor(s: LedgerState, board: string, who: Reader, flags: FlagOverrides): CallerMarks | undefined {
  if (who.caller?.by !== 'agent' || !flagOn('botToolRules', flags)) return undefined;
  const agent = scopeOf(who);
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
  const heldIn = (region: string): boolean => agent === undefined || mayAnswerIn(s, agent, { board, region });
  return { cards, regions, held: holds(s, board, who), answered, heldIn };
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

/** `show_container`'s container `region` marked `held` when the caller may write in it. */
export const markContainer = <T extends object>(c: T, m: CallerMarks | undefined, region: string): T =>
  (m?.heldIn(region) ? { ...c, held: true as const } : c);

/** `get_board`'s answer with its notes marked, `held` when the caller holds the board, and `held` on each region of the
 * View the caller may write in. */
export function markBoard<T extends {
  view: { regions: { id: string }[] };
  state: { items: Record<string, { notes: Note[] }>; containerNotes?: Record<string, Note[]> };
}>(b: T, m: CallerMarks | undefined): T {
  if (!m) return b;
  const view = { ...b.view, regions: b.view.regions.map((r) => markContainer(r, m, r.id)) };
  const items = Object.fromEntries(Object.entries(b.state.items).map(([n, item]) => [n, { ...item, notes: markNotes(item.notes, m.cards.get(Number(n)), (seq) => m.answered(seq, Number(n))) }]));
  const notes = b.state.containerNotes;
  const containerNotes = notes && Object.fromEntries(Object.entries(notes).map(([r, list]) => [r, markRegionNotes(list, m, r)]));
  return { ...b, view, state: { ...b.state, items, ...(containerNotes && { containerNotes }) }, ...(m.held && { held: true as const }) };
}
