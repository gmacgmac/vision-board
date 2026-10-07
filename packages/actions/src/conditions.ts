// What needs attention (D-033): one row per condition, saying what it is about (a kind from
// references.ts), who is told (the person, agents, or both), where the page shows it, when it is
// true and when it ends, and how it is worked out from the folded ledger. `conditionsOf` is every
// row's answer, read alike by the agent reads (`list_open`, `write_board`'s `pending`), the page
// and the tests. A check needed in more than one place is a row here, never a local check. Every
// row reads folded indexes (marks, asks, replies, seen, heads, requests), per board; none walks the
// events. Pure.
import type { LedgerNode } from '../../format/src/index.ts';
import { latest, nodesOf } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { cardsOf, latestAsk } from './notes.ts';
import { mayAnswer, mayAnswerIn } from './permissions.ts';
import type { ReferenceKind } from './references.ts';
import { DECIDED } from './registry.ts';

export const CONDITION_KINDS = [
  'item.owed', 'container.owed', 'item.unseen', 'grant.requested', 'board.drawn', 'board.new', 'board.changed',
] as const;
export type ConditionKind = (typeof CONDITION_KINDS)[number];

/** Who is told: the person (the page), agents (their reads), or both. */
export type Audience = 'person' | 'agent' | 'both';
/** Where the page shows a condition; none for one only agents read. */
export type Shows = 'picker' | 'card' | 'container' | 'strip' | 'toast';

/** One thing that needs attention, by ids only, never text. `seq` is the line it is about. */
export interface Condition { kind: ConditionKind; board: string; container?: string; n?: number; seq?: number }

/** Who asks. `board`: the board asked about, or the board open on the page. `agent`: the asking
 * agent; its rows are scoped to what the permissions table lets it answer, and rows for the
 * person only are left out. Without `agent`, the person's view: every row, every agent's. */
export interface ConditionContext { board?: string; agent?: string }

/** A row: what it is about, who is told and where, when it holds and ends (read by the tests and
 * the docs), and how it is worked out. */
export interface ConditionRow {
  about: ReferenceKind; audience: Audience; shows: readonly Shows[]; trueWhen: string; endsWhen: string;
  derive: (s: LedgerState, ctx: ConditionContext) => Condition[];
}

/** The boards a row looks at: the one asked about, else every board. */
const boardsIn = (s: LedgerState, ctx: ConditionContext): string[] =>
  ctx.board === undefined ? [...s.boards.keys()] : s.boards.has(ctx.board) ? [ctx.board] : [];

/** The items on `board`, by number; for an agent, only those it may answer (api.md 41). */
const itemsOn = (s: LedgerState, board: string, ctx: ConditionContext): LedgerNode[] => nodesOf(s, board)
  .filter((x) => latest(x).item && (ctx.agent === undefined || mayAnswer(s, ctx.agent, x.n)))
  .sort((a, b) => a.n - b.n);

/** Whether a `reply` names the ask `seq` in `to`: one on any card it is on (a note on a group,
 * api.md 64), or, for a note on a whole container, which is on no card, one on any node, since a
 * `seq` names one act (api.md 73). */
function replied(s: LedgerState, seq: number, cards: number[]): boolean {
  const on = cards.length ? cards.map((n) => s.replies.get(n) ?? []) : [...s.replies.values()];
  return on.some((rs) => rs.some((r) => r.to === seq));
}

/** What the agent owes on an item (api.md 36): the `seq` of the person's latest comment or "needs
 * context" that no newer version or reply answers, else of a "later" with no park after it. A
 * decided item owes nothing. */
function owedOn(s: LedgerState, node: LedgerNode): number | undefined {
  const status = s.items.get(node.n)?.status ?? 'open';
  const m = s.marks.get(node.n);
  if (!m || DECIDED.has(status)) return undefined;
  const { ask } = m;
  const made = ask && s.asks.get(ask.seq);
  if (ask && latest(node).ver <= ask.ver && !replied(s, ask.seq, made ? cardsOf(made) : [node.n])) return ask.seq;
  return status === 'later' && m.later !== undefined && (m.park ?? 0) < m.later ? m.later : undefined;
}

/** What the person has not looked at on `board`: `board.new` before their first board seen on it,
 * `board.changed` when an agent wrote on it after that (its last agent line, the `seq` returned),
 * else nothing. The one definition behind both picker rows; the page also reads it for the open
 * board, which is never marked, to know when a board seen is due. */
export function boardNews(s: LedgerState, board: string): { kind: 'board.new' | 'board.changed'; seq: number } | undefined {
  const seen = s.seenBoards.get(board);
  if (seen === undefined) return { kind: 'board.new', seq: s.heads.get(board) ?? 0 };
  const agent = s.agentHeads.get(board) ?? 0;
  return agent > seen ? { kind: 'board.changed', seq: agent } : undefined;
}

/** The boards other than the open one whose `boardNews` is `kind`. */
const marked = (s: LedgerState, ctx: ConditionContext, kind: 'board.new' | 'board.changed'): Condition[] =>
  [...s.boards.keys()].flatMap((board) => {
    const news = board === ctx.board ? undefined : boardNews(s, board);
    return news?.kind === kind ? [{ kind, board, seq: news.seq }] : [];
  });

type Rows = Record<ConditionKind, ConditionRow>;

/** Each condition's row: a new kind without a row is a type error (D-033). */
export const CONDITIONS: Rows = {
  'item.owed': {
    about: 'card', audience: 'agent', shows: [],
    trueWhen: 'An open item has a latest comment or "needs context" that no newer version or reply answers, or a "later" with no park after it.',
    endsWhen: 'A reply naming the note, a newer version, a park after the "later", or the person deciding the item.',
    derive: (s, ctx) => boardsIn(s, ctx).flatMap((board) => itemsOn(s, board, ctx).flatMap((x) => {
      const seq = owedOn(s, x);
      return seq === undefined ? [] : [{ kind: 'item.owed' as const, board, n: x.n, seq }];
    })),
  },
  'container.owed': {
    about: 'container', audience: 'both', shows: ['container'],
    trueWhen: 'A container\'s latest standing note has no reply naming it (api.md 73).',
    endsWhen: 'A reply naming the note, or the person removing it.',
    derive: (s, ctx) => boardsIn(s, ctx).flatMap((board) => [...(s.regionLogs.get(board) ?? [])].flatMap(([region, log]) => {
      if (ctx.agent !== undefined && !mayAnswerIn(s, ctx.agent, { board, region })) return [];
      const ask = latestAsk(log);
      return ask && !replied(s, ask.seq, cardsOf(ask)) ? [{ kind: 'container.owed' as const, board, container: region, seq: ask.seq }] : [];
    })),
  },
  'item.unseen': {
    about: 'card', audience: 'agent', shows: [],
    trueWhen: 'An item\'s latest version is newer than the one the person last saw (D-018).',
    endsWhen: 'The person\'s `seen` for that version.',
    derive: (s, ctx) => boardsIn(s, ctx).flatMap((board) => itemsOn(s, board, ctx)
      .filter((x) => latest(x).ver > (s.seen.get(x.n) ?? 0)).map((x) => ({ kind: 'item.unseen' as const, board, n: x.n }))),
  },
  'grant.requested': {
    about: 'request', audience: 'person', shows: ['strip'],
    trueWhen: 'An agent asked for a board or a container and the person has not answered.',
    endsWhen: 'The person\'s grant or deny.',
    derive: (s, ctx) => [...s.index.requests].flatMap(([seq, r]) => (r.answer || (ctx.board !== undefined && r.board !== ctx.board) ? [] : [{
      kind: 'grant.requested' as const, board: r.board, ...(r.region !== undefined && { container: r.region }), seq,
    }])),
  },
  'board.drawn': {
    about: 'board', audience: 'person', shows: ['toast'],
    trueWhen: 'An agent drew on the open board (a board, region, node, link or unlink line) after the person\'s board seen.',
    endsWhen: 'The person\'s board seen at or after that line.',
    derive: (s, ctx) => {
      const board = ctx.board;
      const seq = board === undefined ? 0 : s.drawnHeads.get(board) ?? 0;
      return board !== undefined && seq > (s.seenBoards.get(board) ?? 0) ? [{ kind: 'board.drawn', board, seq }] : [];
    },
  },
  'board.new': {
    about: 'board', audience: 'person', shows: ['picker'],
    trueWhen: 'A board other than the open one has no board seen.',
    endsWhen: 'The person\'s first board seen on it.',
    derive: (s, ctx) => marked(s, ctx, 'board.new'),
  },
  'board.changed': {
    about: 'board', audience: 'person', shows: ['picker'],
    trueWhen: 'A board other than the open one has an agent\'s line after the person\'s board seen on it; the person\'s own acts never count.',
    endsWhen: 'The person\'s board seen at or after that line.',
    derive: (s, ctx) => marked(s, ctx, 'board.changed'),
  },
};

/** Everything that needs attention for `ctx`, row by row in `CONDITION_KINDS` order. */
export const conditionsOf = (s: LedgerState, ctx: ConditionContext = {}): Condition[] =>
  CONDITION_KINDS.flatMap((kind) => (ctx.agent !== undefined && CONDITIONS[kind].audience === 'person' ? [] : CONDITIONS[kind].derive(s, ctx)));
