// What belongs to what (D-033): one row per kind of thing the ledger names, saying what it
// belongs to and how to look that up, and `scopeOf`, the board, container and cards any ledger
// line touches. Every "which board is this line on", "which cards does this act touch" and "which
// container is this card in now" is asked here, never worked out locally. Derived from the folded
// ledger; nothing is stored. Pure.
import type { ActEvent, ActionId, LedgerEvent } from '../../format/src/index.ts';
import { actCard, containerKey, isContainerAct, LATER_REGION, latest } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { cardsOf } from './notes.ts';

export const REFERENCE_KINDS = ['board', 'container', 'card', 'note', 'link', 'request', 'agent'] as const;
export type ReferenceKind = (typeof REFERENCE_KINDS)[number];

/** One container: a region on a board (D-011). */
export interface Container { board: string; region: string }

/** The board, container and cards something touches; `cards` is empty when it is on no card. */
export interface Scope { board?: string; container?: string; cards: number[] }

/** Where a card is now (`region`) and where its agent last drew it (`drawn`). */
export interface CardPlace extends Container { drawn: string }

/** Card `n`'s place: the person's latest move when that container is on the card's board or is the
 * built-in Later (api.md 66-68), else where the agent last drew it. */
export function placeOf(s: LedgerState, n: number): CardPlace | undefined {
  const x = s.nodes.get(n);
  if (!x) return undefined;
  const drawn = latest(x).region;
  const moved = s.moves.get(n);
  const there = moved !== undefined && (moved === LATER_REGION || (s.index.boards.get(x.board)?.has(moved) ?? false));
  return { board: x.board, region: there ? moved : drawn, drawn };
}

/** A grant request or a revoke: on a container, or with no `region` on the whole board (D-034). */
function onAccess(s: LedgerState, e: { board?: string; region?: string | undefined }): Scope {
  return e.region === undefined ? REFERENCES.board.lookup(s, e.board!) : REFERENCES.container.lookup(s, { board: e.board!, region: e.region });
}

const onCard = (s: LedgerState, n: number): Scope => {
  const p = placeOf(s, n);
  return p ? { board: p.board, container: p.region, cards: [n] } : { cards: [n] };
};

/** A row: what a kind belongs to, in a line, and the lookup that answers it. */
interface Reference { to: readonly ReferenceKind[]; meaning: string; lookup: (s: LedgerState, id: never) => unknown }

export const REFERENCES = {
  board: {
    to: [], meaning: 'A board is a topic; it belongs to nothing.',
    lookup: (_s: LedgerState, board: string): Scope => ({ board, cards: [] }),
  },
  container: {
    to: ['board'], meaning: 'A container is one region on one board.',
    lookup: (_s: LedgerState, c: Container): Scope => ({ board: c.board, container: c.region, cards: [] }),
  },
  card: {
    to: ['container'], meaning: 'A card is in the container the person put it in, else where its agent drew it (placeOf).',
    lookup: onCard,
  },
  note: {
    to: ['card', 'container'], meaning: 'A note is on its card, every card of its group, or a whole container.',
    lookup: (s: LedgerState, seq: number): Scope | undefined => {
      const a = s.asks.get(seq);
      if (!a) return undefined;
      if (a.region === undefined) return { ...onCard(s, a.n), cards: cardsOf(a) };
      const board = [...s.regionLogs].find(([, logs]) => logs.get(a.region!)?.asks.includes(a))?.[0];
      return { ...(board !== undefined && { board }), container: a.region, cards: [] };
    },
  },
  link: {
    to: ['card'], meaning: 'A link joins two cards; it is on the board and in the container of its `from` card.',
    lookup: (s: LedgerState, l: { from: number; to: number }): Scope => ({ ...onCard(s, l.from), cards: [l.from, l.to] }),
  },
  request: {
    to: ['container', 'board'], meaning: 'A grant request asks for one container on one board, or for the whole board.',
    lookup: (s: LedgerState, seq: number): Scope | undefined => {
      const r = s.index.requests.get(seq);
      return r && onAccess(s, r);
    },
  },
  agent: {
    to: ['container'], meaning: 'An agent holds the containers it created or was granted.',
    lookup: (s: LedgerState, agent: string): Container[] => [...s.index.boards].flatMap(([board, regions]) =>
      [...regions].filter((region) => s.index.holders.get(containerKey(board, region))?.has(agent)).map((region) => ({ board, region }))),
  },
} satisfies Record<ReferenceKind, Reference>;

const R = REFERENCES;
const none = (): Scope => ({ cards: [] });
const onContainer = (s: LedgerState, e: { board?: string; region?: string }) => R.container.lookup(s, { board: e.board!, region: e.region! });

/** An act on cards: the cards it names, or every card of the note it changes, on the board and in
 * the container of the card it names first; a note on or a place for a whole container is on it. */
function onCards(s: LedgerState, e: ActEvent): Scope {
  if (isContainerAct(e)) return onContainer(s, e);
  const noted = e.note === undefined ? undefined : R.note.lookup(s, e.note)?.cards;
  const cards = e.nodes ?? noted ?? [e.n!];
  return { ...onCard(s, actCard(e)!), cards };
}

/** Each action's scope (acts by `action`): a new action without a row is a type error. */
const ACT_SCOPES: Record<ActionId, (s: LedgerState, e: ActEvent) => Scope> = {
  ack: onCards, drop: onCards, later: onCards, reopen: onCards, size: onCards,
  comment: onCards, context: onCards, 'note-edit': onCards, 'note-remove': onCards, pin: onCards, unpin: onCards,
  move: (s, e) => ({ ...onCards(s, e), container: e.region! }),
  mode: onContainer, revoke: onAccess,
  grant: (s, e) => R.request.lookup(s, e.request!) ?? none(),
  deny: (s, e) => R.request.lookup(s, e.request!) ?? none(),
  send: (s, e) => R.board.lookup(s, e.board!),
};

type Rule<T extends LedgerEvent['type']> = (s: LedgerState, e: LedgerEvent & { type: T }) => Scope;

/** Each event type's scope: a new event type without a row is a type error. */
const EVENT_SCOPES: { [T in LedgerEvent['type']]: Rule<T> } = {
  board: (s, e) => R.board.lookup(s, e.board),
  region: (s, e) => R.container.lookup(s, { board: e.board, region: e.region.id }),
  'grant-request': onAccess,
  node: (_s, e) => ({ board: e.board, container: e.node.region, cards: [e.n] }),
  link: (s, e) => R.link.lookup(s, e),
  unlink: (s, e) => R.link.lookup(s, e),
  reply: (s, e) => onCard(s, e.n),
  propose: (s, e) => onCard(s, e.n),
  park: (s, e) => onCard(s, e.n),
  seen: (s, e) => ('n' in e ? onCard(s, e.n) : R.board.lookup(s, e.board)),
  join: none,
  act: (s, e) => ACT_SCOPES[e.action](s, e),
};

/** The board, container and cards ledger line `e` touches, read against the state it is folded
 * into. A `join` touches none; a `move` is in the container it moves to. */
export const scopeOf = (s: LedgerState, e: LedgerEvent): Scope => (EVENT_SCOPES[e.type] as Rule<LedgerEvent['type']>)(s, e);

/** The board a ledger line belongs to (fold.ts `heads`, the server's board filters). */
export const eventBoard = (s: LedgerState, e: LedgerEvent): string | undefined => scopeOf(s, e).board;
