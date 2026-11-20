// What a read tells its caller about itself (bot-quality TOOLS_01, the `botToolRules` flag), so a bot never has to
// work it out: each note the caller owes an answer (`owed`), from the condition rows `list_open`'s `pending` and
// `containers` read (`item.owed`, `container.owed`, scoped to the agent: one rule), and each board it holds (`held`),
// by the test `request_grant` answers `held` by (`holders`), and each container it may write in (`held` too), by the rule a
// write into it goes through (`#actions` `mayAnswerIn`, the `region` row of `PERMISSIONS`; api.md 212). Only an agent
// caller is marked: the person's read is as before, and a client with no secret is told only `joined: false`. Flag off,
// nothing is marked either. The folder's one agent (`singleAgent`, plugin.md § The bot) is marked unscoped: every note an
// agent owes is `owed`, every board and container `held`. A note not owed
// says what answered it (`answered`, bot-quality TOOLS_02), by the rule that ends owing (`#actions` `noteAnswer`), so
// "answered" is read, never inferred from a missing `owed`. Every agent read names its caller (`you`, access-clarity PLAN
// decision 1), and a read with no caller at all says so (`joined: false`). `request_grant` answers `held` by `heldBy`,
// the test the marks use, so a read and the grant never disagree (decision 2).
import type { FlagOverrides, OperationOutput } from '#format';
import { flagOn } from '#format';
import type { LedgerState, NoteAnswer } from '#actions';
import { conditionsOf, holders, mayAnswerIn, noteAnswer, numberOf } from '#actions';
import { cardOn } from '../edge.ts';
import type { OpCtx } from './operations.ts';
import { scopeOf } from './operations.ts';

/** The read's `you` (common.schema.json `you`). */
type CallerYou = NonNullable<OperationOutput<'list_boards'>['you']>;

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

/** Would `agent`'s write there pass: the board by its holders (add a container), a container by the rule a write into it
 * goes through (`mayAnswerIn`: the container and its board). The one test the reads mark `held` by and `request_grant`
 * answers `held` by. */
export const heldBy = (s: LedgerState, agent: string, board: string, region?: string): boolean =>
  (region === undefined ? holders(s, board).includes(agent) : mayAnswerIn(s, agent, { board, region }));

/** True when the agent caller holds `board` itself (not only a container on it); the folder's one agent holds every board. */
export const holds = (s: LedgerState, board: string, who: Reader): boolean => {
  if (who.caller?.by !== 'agent') return false;
  const agent = scopeOf(who);
  return agent === undefined || heldBy(s, agent, board);
};

/** Who a read is for, with the flag on: `you` for an agent caller that has joined (the folder's one agent is the first
 * joined, engine.ts `callerOf`; none before any has), `joined: false` for a read with no caller, the case the standalone
 * server makes of a read sent with no Bearer secret (callers.ts `callerOf`, `optional-agent`); the person gets neither.
 * A secret the standalone server knows nowhere reads as no one too (callers.ts `knownAgent`, point 713); the server adds
 * why (handlers.ts `viaEngine`, `joinedReason`): only it holds secrets, so the engine's seam carries none.
 * A read-only read says no `joined`: `readOnly: true` already says nothing can be written, and a read of another ledger
 * (engine.ts `run`, which drops the caller there) is not a read by no one. */
export function callerMark(s: LedgerState, ctx: Pick<OpCtx, 'caller' | 'readOnly' | 'flags'>): { you?: CallerYou; joined?: false } {
  const { caller } = ctx;
  if (!flagOn('botToolRules', ctx.flags)) return {};
  if (caller === undefined) return ctx.readOnly ? {} : { joined: false };
  if (caller.by !== 'agent') return {};
  const label = s.agents.get(caller.agent);
  return label === undefined ? {} : { you: { agent: caller.agent, label } };
}

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
  const heldIn = (region: string): boolean => agent === undefined || heldBy(s, agent, board, region);
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
