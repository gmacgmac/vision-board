// Who may write what (D-033, D-034, api.md 81-86): one row per kind of write item, each answering
// `'ok'`, what the agent must ask the person for (`{ board }`, or `{ board, region }` for a
// container, whose grant brings its board too), or `'creator'` when only the board's creator may
// and no grant helps. Board first: an agent writes on a board only when it holds it, then in a
// container only when it holds that too. Every row reads the access index packages/format folds
// (`LedgerState.index`). Only what exists is judged: an unknown board, region or node is left to the
// context check, so the agent is told what is wrong rather than to ask for a grant it cannot get.
// Pure.
import type { ActEvent } from '#format';
import { accessKey, isContainerAct, latest } from '#format';
import type { LedgerState } from './fold.ts';
import type { Container } from './references.ts';
import { placeOf, scopeOf } from './references.ts';

/** One write item as the server holds it after resolving it: keys and board numbers turned into
 * card identities, the board taken from the path (api.md 34, 35, 125), a retire's cards filled in
 * (api.md 126). Ledger lines fit this shape too. */
export type WriteItem =
  | { type: 'board'; board: string }
  | { type: 'region'; board: string; region: { id: string } }
  | { type: 'node'; board: string; n: number; node: { region: string } }
  | { type: 'link' | 'unlink'; from: number; to: number }
  | { type: 'reply' | 'propose' | 'park'; n: number }
  | { type: 'retire'; board: string; cards: number[]; region?: string };
export type WriteKind = WriteItem['type'];

/** What to ask the person for with `request_grant`: a board, or a container on it. */
export interface Need { board: string; region?: string }
/** A row's answer: allowed, what to ask for, or only the board's creator may. */
export type Verdict = 'ok' | Need | 'creator';

const holds = (s: LedgerState, agent: string, board: string, region?: string) =>
  s.index.holders.get(accessKey(board, region))?.has(agent) ?? false;

/** The board, when it exists and `agent` does not hold it. */
const board = (s: LedgerState, agent: string, b: string): Need | undefined =>
  s.index.boards.has(b) && !holds(s, agent, b) ? { board: b } : undefined;

/** The container, when it exists and `agent` does not hold it. */
const container = (s: LedgerState, agent: string, c: Container | undefined): Need | undefined =>
  c && s.index.boards.get(c.board)?.has(c.region) && !holds(s, agent, c.board, c.region) ? { ...c } : undefined;

/** The container card `id` is in now (references.ts `placeOf`). The built-in Later has no holders,
 * so a card there is judged by the container its agent drew it in (api.md 70). */
function placed(s: LedgerState, id: number): Container | undefined {
  const p = placeOf(s, id);
  return p && { board: p.board, region: s.index.boards.get(p.board)?.has(p.region) ? p.region : p.drawn };
}

/** A write on card `id`: its container, then its board. */
function onCard(s: LedgerState, agent: string, id: number): Verdict {
  const c = placed(s, id);
  return container(s, agent, c) ?? (c && board(s, agent, c.board)) ?? 'ok';
}

/** An answer on card `id`: its author needs only the board, so it can still answer a card the
 * person moved (api.md 24); anyone else, the card's container too. */
function answer(s: LedgerState, agent: string, id: number): Verdict {
  const x = s.nodes.get(id);
  if (!x) return 'ok';
  return latest(x).agent === agent ? board(s, agent, x.board) ?? 'ok' : onCard(s, agent, id);
}

type Rule<K extends WriteKind> = (s: LedgerState, agent: string, item: WriteItem & { type: K }) => Verdict;

/** Each kind of write item's rule: a new kind without a row is a type error (D-033). */
export const PERMISSIONS: { [K in WriteKind]: Rule<K> } = {
  // A new board is its writer's. An existing board's line (its title and summary) only its creator
  // may write (D-034); today the context check refuses a second `board` line from any agent, and
  // the person renames. A board the person made (api.md 90) has no agent creator and no holders:
  // no agent may write its line, and every other row asks for the board.
  board: (s, agent, i) => !s.index.boards.has(i.board) || s.index.creators.get(i.board) === agent ? 'ok' : 'creator',
  // A new container on a board the agent holds; an existing one needs its own grant.
  region: (s, agent, i) => container(s, agent, { board: i.board, region: i.region.id }) ?? board(s, agent, i.board) ?? 'ok',
  // A new node: its container. A new version: the container the card is in now and, when it moves,
  // the target too, so no agent pulls another's card into its own container.
  node: (s, agent, i) =>
    container(s, agent, placed(s, i.n)) ?? container(s, agent, { board: i.board, region: i.node.region }) ?? board(s, agent, i.board) ?? 'ok',
  // A link is in its `from` card's container.
  link: (s, agent, i) => onCard(s, agent, i.from),
  unlink: (s, agent, i) => onCard(s, agent, i.from),
  reply: (s, agent, i) => answer(s, agent, i.n),
  propose: (s, agent, i) => answer(s, agent, i.n),
  park: (s, agent, i) => answer(s, agent, i.n),
  // Like a node update (api.md 126): the container named, or each card's container now, then the board.
  retire: (s, agent, i) =>
    (i.region === undefined ? undefined : container(s, agent, { board: i.board, region: i.region }))
    ?? i.cards.map((id) => container(s, agent, placed(s, id))).find((x) => x !== undefined)
    ?? board(s, agent, i.board) ?? 'ok',
};

/** May `agent` write `item`? Its kind's row in `PERMISSIONS`. */
export const canWrite = (s: LedgerState, agent: string, item: WriteItem): Verdict =>
  (PERMISSIONS[item.type] as Rule<WriteKind>)(s, agent, item);

/** May `agent` answer on card `id`: the `reply` row (api.md 24, 41). It is also what an agent is told
 * it owes (conditions.ts), so one agent is never told to answer another's card. */
export const mayAnswer = (s: LedgerState, agent: string, id: number): boolean => canWrite(s, agent, { type: 'reply', n: id }) === 'ok';

/** May `agent` answer on a whole container (api.md 73, 75): it exists and the `region` row lets the
 * agent edit it, so the agent holds the container and its board (D-034). */
export const mayAnswerIn = (s: LedgerState, agent: string, c: Container): boolean =>
  (s.index.boards.get(c.board)?.has(c.region) ?? false)
  && canWrite(s, agent, { type: 'region', board: c.board, region: { id: c.region } }) === 'ok';

/** Does the person's act concern `agent` (`check_responses`, pending.ts; what Send carries, unsent.ts)? Send always;
 * answers to its own requests and its own removals; anything else in a container it may answer for, on any card it
 * is on (api.md 41). */
export function concerns(s: LedgerState, e: ActEvent, agent: string): boolean {
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
