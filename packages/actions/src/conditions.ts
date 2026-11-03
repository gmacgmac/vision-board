// What needs attention (D-033): one row per condition, saying what it is about (a kind from
// references.ts), who is told (the person, agents, or both), where the page shows it, when it is
// true and when it ends, and how it is worked out from the folded ledger. `conditionsOf` is every
// row's answer, read alike by the agent reads (`list_open`, `write_board`'s `pending`), the page
// and the tests. A row shown on a card also names what the person does that clears it
// (`clearedBy`), which the page reads to know when selecting a card marks it seen; a row shown on a
// container names what ends it on any card in it (`container.fresh`). A check needed in more than one place is a row here, never a local check. Every
// row reads folded indexes (marks, asks, replies, seen, heads, requests, proposals), per board;
// none walks the events. Pure.
import type { LedgerNode } from '#format';
import { latest, NODE_TYPES, nodesOf } from '#format';
import type { LedgerState } from './fold.ts';
import { latestAsk } from './notes.ts';
import { noteAnswer } from './note-answer.ts';
import { unseenAnswer, unseenReply } from './clears.ts';
import { mayAnswer, mayAnswerIn } from './permissions.ts';
import { visibleToAgents } from './archive.ts';
import type { ReferenceKind } from './references.ts';
import { standing } from './proposals.ts';
import { drawnAfterOpening } from './rounds.ts';
import type { FreshCard } from './fresh.ts';
import { freshContainers, freshOf } from './fresh.ts';
import type { ItemStatus } from './registry.ts';
import { CLOSED, isDecided } from './registry.ts';
import { unsentOn } from './unsent.ts';

export const CONDITION_KINDS = [
  'item.owed', 'container.owed', 'item.new', 'item.unseen', 'container.fresh', 'item.awaiting', 'proposal.open', 'proposal.stale', 'grant.requested',
  'board.drawn', 'board.new', 'board.changed', 'board.unsent',
] as const;
export type ConditionKind = (typeof CONDITION_KINDS)[number];

/** Who is told: the person (the page), agents (their reads), or both. */
export type Audience = 'person' | 'agent' | 'both';
/** Where the page shows a condition; none for one only agents read. `send`: Send to agent. */
export type Shows = 'picker' | 'card' | 'container' | 'strip' | 'toast' | 'send';
/** What the person does that ends a card's label: `select` the card (the page sends its `seen`), or
 * `act` on it (any act naming it but a Send, api.md 94). A Send ends no label (new-and-updated
 * Design 2). `select` is the person's own (a click, Space, a lasso); a card found (Go to card, a
 * finder list, search) is selected too but is not one (`SelectedBy`, `clearsOn`, ruling 322). */
export type ClearedBy = 'select' | 'act';

/** How a card came to be selected: `select`, the person's own, or `find`, going to it to look for it
 * (the page's go path, board/find/go-to-card.ts). Only the first can end a label (`clearsOn`). */
export type SelectedBy = 'select' | 'find';

/** One thing that needs attention, by ids only, never text. `seq` is the line it is about; `id`
 * the card's identity (a read gives its board number: numbers.ts). */
export interface Condition { kind: ConditionKind; board: string; container?: string; id?: number; seq?: number }

/** Who asks. `board`: the board asked about, or the board open on the page. `agent`: the asking
 * agent; its rows are scoped to what the permissions table lets it answer, and rows for the
 * person only are left out. Without `agent`, the person's view: every row, every agent's. `sendTo`:
 * the agent the person's chat talks to on the board, whose Send carries only what it may read (`board.unsent`). */
export interface ConditionContext { board?: string; agent?: string; sendTo?: string | undefined }

/** A row: what it is about, who is told and where, when it holds and ends (read by the tests and
 * the docs), and how it is worked out. */
export interface ConditionRow {
  about: ReferenceKind; audience: Audience; shows: readonly Shows[]; trueWhen: string; endsWhen: string;
  /** What clears it, for a row shown on a card or a container (on any card in it); empty elsewhere,
   * and on such a row nothing of these ends. */
  clearedBy: readonly ClearedBy[];
  derive: (s: LedgerState, ctx: ConditionContext) => Condition[];
}

/** Every board agents see, so an archived one never carries a row or a picker mark (api.md 136). */
const shown = (s: LedgerState): string[] => [...s.boards.keys()].filter((board) => visibleToAgents(s, board));

/** The boards a row looks at: the one asked about, else every board agents see. */
const boardsIn = (s: LedgerState, ctx: ConditionContext): string[] =>
  ctx.board === undefined ? shown(s) : s.boards.has(ctx.board) ? [ctx.board] : [];

/** Every card on `board`, by number (every-node ruling 5, assumption A: the card rows are on
 * every card, api.md 120); for an agent, only those it may answer (api.md 41). */
const cardsOn = (s: LedgerState, board: string, ctx: ConditionContext): LedgerNode[] => nodesOf(s, board)
  .filter((x) => ctx.agent === undefined || mayAnswer(s, ctx.agent, x.id))
  .sort((a, b) => a.id - b.id);

/** Whether card `node` is decided: only a card that needs an answer can be (registry.ts). */
const decided = (s: LedgerState, node: LedgerNode): boolean => isDecided(latest(node).kind, s.items.get(node.id)?.status ?? 'open');

// Whether a `reply` names an ask (note-lock.ts, where it also locks the note).
import { replied } from './note-lock.ts';
export { replied };

/** What the agent owes on a card (api.md 36, 120): its owed note (`owedNote`), else a "later" with
 * no park after it. A card closed with ✓ or ✗ owes no handover. */
export const owedOn = (s: LedgerState, node: LedgerNode): number | undefined => owedNote(s, node) ?? awaitingPark(s, node.id);

/** The `seq` of the person's latest note on a card (an old "needs context" is one) that nothing
 * answers (`noteAnswer`: a reply, a newer version, or a ✓ or ✗ after it). A note never answers a
 * card, so it is owed on any card until then (D-045). While it is owed, the card is with the agent
 * (`cardStatus`, D-046). */
export function owedNote(s: LedgerState, node: LedgerNode): number | undefined {
  const ask = s.marks.get(node.id)?.ask;
  const made = ask && s.asks.get(ask.seq);
  return made && !noteAnswer(s, made, node.id) ? made.seq : undefined;
}

/** Where card `node` stands with the person (D-046), the one status every read gives: its ✓, ✗ or
 * Later; else `commented`, with the agent, while its latest note is owed (`owedNote`); else open.
 * The fold's status holds the marks alone (notes.ts `itemOf`). */
export function cardStatus(s: LedgerState, node: LedgerNode): ItemStatus {
  const marked = s.items.get(node.id)?.status ?? 'open';
  if (marked !== 'open') return marked;
  return owedNote(s, node) === undefined ? 'open' : 'commented';
}

/** The `seq` of an item's "later" that no park follows yet: its handover is still owed (D-020). */
function awaitingPark(s: LedgerState, id: number): number | undefined {
  const m = s.marks.get(id);
  return s.items.get(id)?.status === 'later' && m?.later !== undefined && (m.park ?? 0) < m.later ? m.later : undefined;
}

/** The proposals on cards that need an answer and are not closed (✓ or ✗ ends a proposal, so a
 * comment leaves it standing), on the boards asked about, that stand `at` (proposals.ts). An old
 * board's proposal on another kind never shows (api.md 120). */
const proposalsAt = (s: LedgerState, ctx: ConditionContext, at: 'open' | 'stale'): Condition[] => {
  const boards = new Set(boardsIn(s, ctx));
  return [...s.proposals.values()].flatMap((p) => {
    const node = s.nodes.get(p.id);
    if (!node || !boards.has(node.board) || !NODE_TYPES[latest(node).kind].answer || CLOSED.has(s.items.get(p.id)?.status ?? 'open')) return [];
    return standing(s, p) === at ? [{ kind: `proposal.${at}` as const, board: node.board, id: p.id, seq: p.seq }] : [];
  });
};

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
  shown(s).flatMap((board) => {
    const news = board === ctx.board ? undefined : boardNews(s, board);
    return news?.kind === kind ? [{ kind, board, seq: news.seq }] : [];
  });

type Rows = Record<ConditionKind, ConditionRow>;

/** Each condition's row: a new kind without a row is a type error (D-033). */
export const CONDITIONS: Rows = {
  'item.owed': {
    about: 'card', audience: 'agent', shows: [], clearedBy: [],
    trueWhen: 'A card of any kind has a latest note (an old "needs context" is one) with no ✓ or ✗ after it that no newer version or reply answers, or, not closed with ✓ or ✗, a "later" with no park after it (api.md 120, D-045: a note never answers a card).',
    endsWhen: 'A reply naming the note, a newer version, a park after the "later", or the person\'s ✓ or ✗ on the card after the note.',
    derive: (s, ctx) => boardsIn(s, ctx).flatMap((board) => cardsOn(s, board, ctx).flatMap((x) => {
      const seq = owedOn(s, x);
      return seq === undefined ? [] : [{ kind: 'item.owed' as const, board, id: x.id, seq }];
    })),
  },
  'container.owed': {
    about: 'container', audience: 'both', shows: ['container'], clearedBy: [],
    trueWhen: 'A container\'s latest standing note has no reply naming it (api.md 73).',
    endsWhen: 'A reply naming the note, or the person removing it.',
    derive: (s, ctx) => boardsIn(s, ctx).flatMap((board) => [...(s.regionLogs.get(board) ?? [])].flatMap(([region, log]) => {
      // A retired container has left the board (api.md 127): nothing on it is owed now.
      if (!s.index.boards.get(board)?.has(region)) return [];
      if (ctx.agent !== undefined && !mayAnswerIn(s, ctx.agent, { board, region })) return [];
      const ask = latestAsk(log);
      return ask && !noteAnswer(s, ask) ? [{ kind: 'container.owed' as const, board, container: region, seq: ask.seq }] : [];
    })),
  },
  'item.new': {
    about: 'card', audience: 'person', shows: ['card'], clearedBy: ['select', 'act'],
    trueWhen: 'A card of any kind, not decided (registry.ts `isDecided`), that the agent first drew after the person first opened the board (rounds.ts `newFrom`: after the person\'s first board seen on it, or after the agent\'s first drawing with a card when they opened it with none, so a first drawing is never new), with no seen at any version: the card\'s NEW tab. A Send and the agent drawing again change nothing (new-and-updated Design 2).',
    endsWhen: 'The person selecting it (its `seen`), any act of theirs naming it but a Send (api.md 94), or a decision on it.',
    derive: (s, ctx) => boardsIn(s, ctx).flatMap((board) => cardsOn(s, board, ctx).flatMap((x) => {
      const seq = s.firstDrawn.get(x.id) ?? 0;
      const fresh = !s.seen.has(x.id) && !decided(s, x) && drawnAfterOpening(s, board, seq);
      return fresh ? [{ kind: 'item.new' as const, board, id: x.id, seq }] : [];
    })),
  },
  'item.unseen': {
    about: 'card', audience: 'both', shows: ['card'], clearedBy: ['select', 'act'],
    trueWhen: 'A card\'s latest version is newer than the one the person last saw (D-018), or the agent\'s answer to its latest note cleared it after the person last looked at it (clears.ts `unseenAnswer`, D-045), or the agent replied on it after the person last looked at it, whether or not the reply answers a note or clears anything (clears.ts `unseenReply`, review polish round 2 ruling 4). The page shows a newer version as the card\'s "N updates" tab only past version 1, reading `ver > max(seen, 1)`, and never on a card `item.new` holds for (NEW only): a new card carries no updates tab.',
    endsWhen: 'The person\'s `seen` for that version (any card `seen` after the agent\'s answer or reply), or any act of theirs naming the card but a Send (api.md 94).',
    derive: (s, ctx) => boardsIn(s, ctx).flatMap((board) => cardsOn(s, board, ctx)
      .filter((x) => latest(x).ver > (s.seen.get(x.id) ?? 0) || unseenAnswer(s, x.id) || unseenReply(s, x.id) !== undefined).map((x) => ({ kind: 'item.unseen' as const, board, id: x.id }))),
  },
  'container.fresh': {
    about: 'container', audience: 'person', shows: ['container'], clearedBy: ['select', 'act'],
    trueWhen: 'A container holds a card `item.new` or `item.unseen` holds for (as its tab shows it: fresh.ts `freshOf`) whose newest change, the agent\'s latest version or reply on it, is after the person\'s latest card seen or act on any card in the container (`looked`): its teal border and its "3 new · 1 updated" pill (new-and-updated Design 3). Nothing is stored.',
    endsWhen: 'The person selecting a new or updated card in it (its `seen`) or any act of theirs naming a card in it, until the agent changes one of its cards again. A click on the frame ends nothing.',
    derive: (s, ctx) => boardsIn(s, ctx).flatMap((board) => [...freshContainers(s, board, freshCards(s, board))]
      .map(([container, seq]) => ({ kind: 'container.fresh' as const, board, container, seq }))),
  },
  'item.awaiting': {
    about: 'card', audience: 'both', shows: ['card'], clearedBy: [],
    trueWhen: 'A card of any kind in Later has no park after its "later": the agent still owes its handover (D-020).',
    endsWhen: 'A park after the "later", or the card leaving Later.',
    derive: (s, ctx) => boardsIn(s, ctx).flatMap((board) => cardsOn(s, board, ctx).flatMap((x) => {
      const seq = awaitingPark(s, x.id);
      return seq === undefined ? [] : [{ kind: 'item.awaiting' as const, board, id: x.id, seq }];
    })),
  },
  'proposal.open': {
    about: 'card', audience: 'person', shows: ['card', 'strip'], clearedBy: [],
    trueWhen: 'An agent proposed acknowledging or dropping a card that needs an answer and is not closed, on its latest version, and the person has not answered (api.md 93, 120).',
    endsWhen: 'The person accepting or rejecting it, ✓ or ✗ on the card, the card being retired, or a newer version (then `proposal.stale`).',
    derive: (s, ctx) => proposalsAt(s, ctx, 'open'),
  },
  'proposal.stale': {
    about: 'card', audience: 'person', shows: ['card', 'strip'], clearedBy: [],
    trueWhen: 'A proposal not yet answered on a card that needs an answer and is not closed, with a newer version than the one it was made on: it can only be rejected (api.md 93).',
    endsWhen: 'The person rejecting it, ✓ or ✗ on the card, or the card being retired.',
    derive: (s, ctx) => proposalsAt(s, ctx, 'stale'),
  },
  'grant.requested': {
    about: 'request', audience: 'person', shows: ['strip'], clearedBy: [],
    trueWhen: 'An agent asked for a board or a container and the person has not answered.',
    endsWhen: 'The person\'s grant or deny.',
    derive: (s, ctx) => [...s.index.requests].flatMap(([seq, r]) => (r.answer || (ctx.board !== undefined && r.board !== ctx.board) ? [] : [{
      kind: 'grant.requested' as const, board: r.board, ...(r.region !== undefined && { container: r.region }), seq,
    }])),
  },
  'board.drawn': {
    about: 'board', audience: 'person', shows: ['toast'], clearedBy: [],
    trueWhen: 'An agent drew on the open board (a board, region, node, link or unlink line) after the person\'s board seen.',
    endsWhen: 'The person\'s board seen at or after that line.',
    derive: (s, ctx) => {
      const board = ctx.board;
      const seq = board === undefined ? 0 : s.drawnHeads.get(board) ?? 0;
      return board !== undefined && seq > (s.seenBoards.get(board) ?? 0) ? [{ kind: 'board.drawn', board, seq }] : [];
    },
  },
  'board.new': {
    about: 'board', audience: 'person', shows: ['picker'], clearedBy: [],
    trueWhen: 'A board other than the open one has no board seen.',
    endsWhen: 'The person\'s first board seen on it.',
    derive: (s, ctx) => marked(s, ctx, 'board.new'),
  },
  'board.changed': {
    about: 'board', audience: 'person', shows: ['picker'], clearedBy: [],
    trueWhen: 'A board other than the open one has an agent\'s line after the person\'s board seen on it; the person\'s own acts never count.',
    endsWhen: 'The person\'s board seen at or after that line.',
    derive: (s, ctx) => marked(s, ctx, 'board.changed'),
  },
  'board.unsent': {
    about: 'board', audience: 'person', shows: ['send'], clearedBy: [],
    trueWhen: 'The open board has an answer of the person\'s since its last Send that the Send message carries (registry.ts `isAnswer`, unsent.ts): a card\'s ✓, ✗, Later or clear when it leaves the card otherwise than at the last Send (D-045), a note, a proposal turned down, a note on a whole container. A move into or out of Later counts through its Later or Reopen; arranging the board alone (pin, size, mode, a move between containers) and a note removed before Send do not. Send to agent is enabled only then (field report batch 1, ruling 1). With the chat\'s agent (`sendTo`), only an answer it may read counts (point 384).',
    endsWhen: 'The person\'s Send on the board.',
    derive: (s, ctx) => {
      const seq = ctx.board === undefined ? undefined : unsentOn(s, ctx.board, ctx.sendTo);
      return seq === undefined ? [] : [{ kind: 'board.unsent', board: ctx.board!, seq }];
    },
  },
};

/** Whether a selection that came about `by` ends condition `kind` on the card (its row's `clearedBy`):
 * the page sends the card's `seen` for each card condition it holds, which also ends a container's
 * (`container.fresh`). Only the person's own select does; a find ends nothing, whatever the row names. */
export const clearsOn = (kind: ConditionKind, by: SelectedBy): boolean => by === 'select' && CONDITIONS[kind].clearedBy.includes('select');

/** Whether the person's own select ends condition `kind` (`clearsOn`). */
export const clearsOnSelect = (kind: ConditionKind): boolean => clearsOn(kind, 'select');

/** Everything that needs attention for `ctx`, row by row in `CONDITION_KINDS` order. */
export const conditionsOf = (s: LedgerState, ctx: ConditionContext = {}): Condition[] =>
  CONDITION_KINDS.flatMap((kind) => (ctx.agent !== undefined && CONDITIONS[kind].audience === 'person' ? [] : CONDITIONS[kind].derive(s, ctx)));

/** The new and updated cards of `board` (`item.new`, `item.unseen` as the tab shows it), in board
 * order: the toolbar's "N new" list and every container's pill read this one list, so the count, the
 * list and the tabs never disagree (new-and-updated Design 5). */
export function freshCards(s: LedgerState, board: string): FreshCard[] {
  const ids = (kind: ConditionKind) => new Set(CONDITIONS[kind].derive(s, { board }).map((c) => c.id!));
  return freshOf(s, board, ids('item.new'), ids('item.unseen'));
}
