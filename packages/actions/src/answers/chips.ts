// Chips: what the board adds to the chat, and what a chip says when the message is sent. nclite's
// plugin contract (draft v0.1, plugins.md § Chips) has a chip be a reference, not a copy: the view
// adds `{ kind, ref, label, detail }`, the host adds the plugin, and on send every chip is resolved
// by asking its plugin for its current text. A chip that is gone or has changed stops the send, with
// the plugin's reason. These are the board's answers to both, from the folded ledger, with no I/O
// (the engine's `resolve` calls them). A card's `ref` is its board and number and the
// version it was at when the chip was made; a note's, its board and sequence and the line that last
// edited it, so a chip is refused when its own words changed and survives edits elsewhere. Two chips
// follow the board live, one key each (D-074 rule 6, host.ts `BoardChat`): `selection`, the cards
// selected, and `answers`, the person's answers since the last Send. Each may carry a `preview`, what
// it says as the page sees it; `resolve` is what counts when the message goes. The
// refusal sentences are the words of every refusal here, `turnOf`'s included (ARCH_05 re-homes them).
import { cardId, clip, containerKey, latest } from '#format';
import type { Ask } from '../notes.ts';
import { roundOf, selectionText } from '../board-message.ts';
import type { Round, SelectedCard } from '../board-message.ts';
import { boardLocked } from '../lock.ts';
import { eventBoard } from '../references.ts';
import type { LedgerState } from '../fold.ts';
import { numberOf } from '../numbers.ts';
import { boardVisibility } from '../archive.ts';
import { boardData, boardJson } from './board-data.ts';
import * as actionsChipsWords from '../words/actions-chips.ts';

/** This plugin's id in a chip. */
export const CHIP_PLUGIN = 'board';
/** What the board can add to the chat: a card, a note, the board itself, the selected cards, or the answers. */
export type ChipKind = 'card' | 'note' | 'board' | 'selection' | 'answers';

/** A card chip's reference: the card's number on its board, and the version it was at (its text). */
export interface CardRef { board: string; n: number; ver: number }
/** A note chip's reference: the note's sequence on its board, and the line that last edited it. */
export interface NoteRef { board: string; seq: number; rev: number }
/** A board chip's reference: the board, and the ledger's head when the chip was made. The head only
 * records when; a board always changes, so it is never a reason to refuse the chip. */
export interface BoardRef { board: string; head: number }
/** A selection chip's reference: the cards by number, in the order selected. */
export interface SelectionRef { board: string; cards: number[] }
/** An answers chip's reference: the board, the ledger line they count from, and the agent they are
 * for (only what it may read; every answer with none). */
export interface AnswersRef { board: string; since: number; agent?: string | undefined }
export type ChipRef = CardRef | NoteRef | BoardRef | SelectionRef | AnswersRef;

interface ChipOf<K extends ChipKind, R> { plugin: typeof CHIP_PLUGIN; kind: K; ref: R; label: string; detail: string; preview?: string }
export type CardChip = ChipOf<'card', CardRef>;
export type NoteChip = ChipOf<'note', NoteRef>;
export type BoardChip = ChipOf<'board', BoardRef>;
export type SelectionChip = ChipOf<'selection', SelectionRef>;
export type AnswersChip = ChipOf<'answers', AnswersRef>;

/** The contract's chip, as the board makes it. `label` is the short line the composer draws; `detail`
 * where it is, under it; `preview`, on the two live ones, what it says now. A host may pass any chip
 * through unread: it goes back to `resolve` by its `kind` and `ref`. */
export type Chip = CardChip | NoteChip | BoardChip | SelectionChip | AnswersChip;

/** One value of a `Ref`: a short string, a whole number, a boolean, or a short list of strings or numbers. */
export type RefValue = string | number | boolean | readonly (string | number)[];

/** A small flat object of the board's own keys, the seam's one reference (docs/specification/plugin.md, One shape
 * everywhere): what an event says changed, what a change line or a chip reveals, what a chip's answer acknowledges.
 * `{}` is a catch-up: anything may have changed. A type, not an interface, so a plain object of these values is one. */
export type Ref = { readonly [key: string]: RefValue };

/** What the answers chip's `resolve` acknowledges: the board, and `head`, the ledger line it was read through. */
export type AnswersAck = { board: string; head: number };

/** What a chip says now: `where` it is, then its `text`: one block of the bot's prompt; `ack`, what its Send acknowledges. */
export interface ChipText { where: string; text: string; ack?: Ref }

/** What an answers chip says now: its text ('' when nothing was answered since, or the board is
 * locked), how many answer lines, the notes they carry, so a message attaches none of them again, and
 * `ack`, the board and the ledger line it was read through: what the Send's record is given back (`acksRead`). */
export type AnswersText = ChipText & Round & { ack: AnswersAck };

/** What the board records for a Send, from what its host says went (`acksRead`): the head the answers were read
 * through; null when nothing went for this board; left out when no chat carried them. */
export type AnswersRead = { head: number } | null | undefined;

/** Why a chip, or the turn, is refused: nothing there (an unknown board, card or note, or a note
 * taken away), the card or container was removed (or the board archived), the note is hidden, or its
 * words changed since the chip was made. `reason` is the sentence the person reads under it. */
export type RefusalCode = 'gone' | 'retired' | 'hidden' | 'changed';
export interface ChipRefusal { refused: RefusalCode; reason: string }

/** The longest label a card's chip has, and a note's. */
export const CARD_LABEL = 200;
export const NOTE_LABEL = 80;

const refusal = (refused: RefusalCode, reason: string): ChipRefusal => ({ refused, reason });
const noBoard = (board: string) => refusal('gone', actionsChipsWords.thereIsNoBoard(board));
const noCard = (board: string, n: number) => refusal('gone', actionsChipsWords.thereIsNoCardOn(n, board));
const noNote = (board: string, seq: number) => refusal('gone', actionsChipsWords.thereIsNoNoteOn(seq, board));

/** Card `n` on `board`: its identity, and its title now; a refusal when it is not there or was removed. */
function cardNow(s: LedgerState, board: string, n: number) {
  if (!s.index.boards.has(board)) return noBoard(board);
  const id = cardId(s.index, board, n);
  const node = id === undefined ? undefined : s.nodes.get(id);
  if (!node) return noCard(board, n);
  if (node.retired !== undefined) return refusal('retired', actionsChipsWords.cardOnBoardWasRemoved(n, board));
  return { title: latest(node).title, ver: latest(node).ver };
}

/** A note's card (its identity) as the prompt names it: board number and title. */
const cardLine = (s: LedgerState, id: number) => actionsChipsWords.card(numberOf(s, id), s.nodes.get(id) ? latest(s.nodes.get(id)!).title : '?');

/** Note `seq` on `board`: the ask, and where it is; a refusal when it is not there, its card or
 * container was removed, or its card's notes are hidden. */
function noteNow(s: LedgerState, board: string, seq: number): ChipRefusal | { ask: Ask & { text: string }; on: string; rev: number } {
  if (!s.index.boards.has(board)) return noBoard(board);
  const ask = s.asks.get(seq);
  const act = s.acts.find((e) => e.seq === seq);
  if (!ask?.text || ask.removed !== undefined || !act || eventBoard(s, act) !== board) return noNote(board, seq);
  const cards = ask.nodes ?? [ask.id];
  if (ask.region !== undefined) {
    if (s.retiredRegions.has(containerKey(board, ask.region))) return refusal('retired', actionsChipsWords.containerOnBoardWasRemoved(ask.region, board));
  } else {
    if (cards.some((id) => s.nodes.get(id)?.retired !== undefined)) return refusal('retired', actionsChipsWords.theCardNoteIsOn(seq));
    if (cards.every((id) => s.notesHidden.has(id))) return refusal('hidden', actionsChipsWords.noteIsHidden(seq));
  }
  const on = ask.region !== undefined ? actionsChipsWords.container(ask.region) : cards.map((id) => cardLine(s, id)).join(', ');
  return { ask: ask as Ask & { text: string }, on, rev: ask.changed ?? ask.seq };
}

/** The chip for card `n` on `board` as it stands now; a refusal when it cannot be added. */
export function cardChip(s: LedgerState, board: string, n: number): CardChip | ChipRefusal {
  const card = cardNow(s, board, n);
  if ('refused' in card) return card;
  return {
    plugin: CHIP_PLUGIN, kind: 'card', ref: { board, n, ver: card.ver },
    label: clip(card.title, CARD_LABEL) || actionsChipsWords.card2(n), detail: actionsChipsWords.cardOnBoard(n, board),
  };
}

/** The chip for note `seq` on `board` as it stands now; a refusal when it cannot be added. */
export function noteChip(s: LedgerState, board: string, seq: number): NoteChip | ChipRefusal {
  const note = noteNow(s, board, seq);
  if ('refused' in note) return note;
  return {
    plugin: CHIP_PLUGIN, kind: 'note', ref: { board, seq, rev: note.rev },
    label: clip(note.ask.text, NOTE_LABEL), detail: actionsChipsWords.noteOn(seq, note.on),
  };
}

/** Board `board` as a chip refers to it: its title, or a refusal when it is not there or is archived. */
function boardNow(s: LedgerState, board: string): ChipRefusal | { title: string } {
  if (!s.index.boards.has(board)) return noBoard(board);
  if (boardVisibility(s, board) === 'archived') return refusal('retired', actionsChipsWords.boardIsArchived(board));
  return { title: s.boards.get(board)?.title ?? board };
}

/** The chip for the board `board` as it stands now (the head records when it was added); a refusal
 * when it is not there or is archived. Its text is the whole board, read when the message is sent. */
export function boardChip(s: LedgerState, board: string): BoardChip | ChipRefusal {
  const now = boardNow(s, board);
  if ('refused' in now) return now;
  return {
    plugin: CHIP_PLUGIN, kind: 'board', ref: { board, head: s.seq },
    label: clip(now.title, CARD_LABEL) || board, detail: actionsChipsWords.board(board),
  };
}

/** The chip for the cards selected on `board`, in the order selected; null with none. */
export function selectionChip(board: string, cards: readonly SelectedCard[]): SelectionChip | null {
  if (cards.length === 0) return null;
  return {
    plugin: CHIP_PLUGIN, kind: 'selection', ref: { board, cards: cards.map((c) => c.n) },
    label: actionsChipsWords.selected(cards.length), detail: actionsChipsWords.board(board), preview: selectionText(cards),
  };
}

/** The chip for the person's answers on `board` no Send has carried (`sentHead`), as `agent` may read them; null
 * with none, and on a locked board, whose answers wait for the unlock. */
export function answersChip(s: LedgerState, board: string, agent?: string): AnswersChip | null {
  const since = s.sentHead.get(board) ?? 0;
  const round = boardLocked(s, board) ? undefined : roundOf(s, board, since, agent);
  if (!round) return null;
  return {
    plugin: CHIP_PLUGIN, kind: 'answers', ref: { board, since, ...(agent !== undefined && { agent }) },
    label: actionsChipsWords.answers(round.count), detail: actionsChipsWords.board(board), preview: round.text,
  };
}

/** What the chip of `kind` and `ref` says now (the contract's `resolve(kind, ref)`): where it is and
 * its text, or why it is refused: gone, removed, hidden, or changed since the chip was made. A board
 * chip is never `changed`: a board always moves on, and its text is the board as it is now. */
export function resolveChip(s: LedgerState, kind: 'card', ref: CardRef): ChipText | ChipRefusal;
export function resolveChip(s: LedgerState, kind: 'note', ref: NoteRef): ChipText | ChipRefusal;
export function resolveChip(s: LedgerState, kind: 'board', ref: BoardRef): ChipText | ChipRefusal;
export function resolveChip(s: LedgerState, kind: 'selection', ref: SelectionRef): ChipText | ChipRefusal;
export function resolveChip(s: LedgerState, kind: 'answers', ref: AnswersRef): AnswersText | ChipRefusal;
export function resolveChip(s: LedgerState, kind: ChipKind, ref: ChipRef): ChipText | ChipRefusal {
  if (kind === 'answers') {
    const { board, since, agent } = ref as AnswersRef;
    const turn = boardLocked(s, board) ? undefined : turnOf(s, board, since, agent);
    if (turn && 'refused' in turn) return turn;
    const said: AnswersText = { where: actionsChipsWords.board(board), ...(turn ?? { text: '', count: 0, notes: new Set<number>() }), ack: { board, head: s.seq } };
    return said;
  }
  if (kind === 'selection') {
    const { board, cards } = ref as SelectionRef;
    if (!s.index.boards.has(board)) return noBoard(board);
    const now: SelectedCard[] = [];
    for (const n of cards) {
      const card = cardNow(s, board, n);
      if ('refused' in card) return card;
      now.push({ n, title: card.title });
    }
    return { where: actionsChipsWords.board(board), text: selectionText(now) };
  }
  if (kind === 'board') {
    const { board } = ref as BoardRef;
    const now = boardNow(s, board);
    if ('refused' in now) return now;
    return { where: actionsChipsWords.board(board), text: JSON.stringify(boardJson(boardData(s, board))) };
  }
  if (kind === 'card') {
    const { board, n, ver } = ref as CardRef;
    const card = cardNow(s, board, n);
    if ('refused' in card) return card;
    if (card.ver !== ver) return refusal('changed', actionsChipsWords.cardOnBoardChangedSince(n, board));
    return { where: actionsChipsWords.boardCard(board, n), text: card.title };
  }
  const { board, seq, rev } = ref as NoteRef;
  const note = noteNow(s, board, seq);
  if ('refused' in note) return note;
  if (note.rev !== rev) return refusal('changed', actionsChipsWords.noteOnBoardChangedSince(seq, board));
  return { where: actionsChipsWords.boardNoteOn(board, seq, note.on), text: note.ask.text };
}

/** The person's answers on `board` since line `since`, as `agent` reads them (the contract's per-turn
 * hook, plugins.md; `roundOf` is the query): the round, none when nothing was answered, or a refusal
 * (with the chips' words) for a board the ledger does not hold. */
export function turnOf(s: LedgerState, board: string, since: number, agent?: string): Round | ChipRefusal | undefined {
  return s.index.boards.has(board) ? roundOf(s, board, since, agent) : noBoard(board);
}

/** A whole number from 0, as a ref's `head`, `n`, `seq` and `cards` hold one: the one check every reader of a ref uses. */
export const isCount = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

/** What a host's `record(acks)` says went for `board` (plugin.md § The chat): null, a host with no chat, is left out (the
 * Send covers every answer up to its own line); else the first ack of `board` with a whole-number `head`, its other keys
 * ignored; none (`[]`, another board's, a head that names no line) acknowledges nothing new. */
export function acksRead(acks: readonly Ref[] | null, board: string): AnswersRead {
  if (acks === null) return undefined;
  const ack = acks.find((a) => a.board === board && isCount(a.head));
  return ack ? { head: ack.head as number } : null;
}

/** The `head` the board's Send records for `read`, what the host says went (point 377): left out when no chat
 * carried the answers (the Send covers every answer up to its own line, as before v19); what the answers chip
 * was read through when it went; the board's watermark, acknowledging nothing new, when it did not (null), or
 * when what was given names no line. */
export function sendHead(s: LedgerState, board: string, read: AnswersRead): { head?: number } {
  if (read === undefined) return {};
  const head = read?.head;
  return { head: Number.isInteger(head) && head! >= 0 ? head! : s.sentHead.get(board) ?? 0 };
}
