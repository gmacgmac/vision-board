// Chips: what the board adds to the chat, and what a chip says when the message is sent. nclite's
// plugin contract (draft v0.1, plugins.md § Chips) has a chip be a reference, not a copy: the view
// adds `{ kind, ref, label, detail }`, the host adds the plugin, and on send every chip is resolved
// by asking its plugin for its current text. A chip that is gone or has changed stops the send, with
// the plugin's reason. These are the board's answers to both, from the folded ledger, with no I/O
// (the engine's `resolve` and the chat prompt call them). A card's `ref` is its board and number and the
// version it was at when the chip was made; a note's, its board and sequence and the line that last
// edited it, so a chip is refused when its own words changed and survives edits elsewhere. The
// refusal sentences are the words of every refusal here, `turnOf`'s included (ARCH_05 re-homes them).
import { cardId, clip, containerKey, latest } from '#format';
import type { Ask } from '../notes.ts';
import { roundOf } from '../board-message.ts';
import type { Round } from '../board-message.ts';
import { eventBoard } from '../references.ts';
import type { LedgerState } from '../fold.ts';
import { numberOf } from '../numbers.ts';
import { boardVisibility } from '../archive.ts';
import { boardData, boardJson } from './board-data.ts';
import * as actionsChipsWords from '../words/actions-chips.ts';

/** This plugin's id in a chip. */
export const CHIP_PLUGIN = 'board';
/** What the board can add to the chat: a card, a note, or the board itself. */
export type ChipKind = 'card' | 'note' | 'board';

/** A card chip's reference: the card's number on its board, and the version it was at (its text). */
export interface CardRef { board: string; n: number; ver: number }
/** A note chip's reference: the note's sequence on its board, and the line that last edited it. */
export interface NoteRef { board: string; seq: number; rev: number }
/** A board chip's reference: the board, and the ledger's head when the chip was made. The head only
 * records when; a board always changes, so it is never a reason to refuse the chip. */
export interface BoardRef { board: string; head: number }
export type ChipRef = CardRef | NoteRef | BoardRef;

/** The contract's chip, as the board makes it. `label` is the short line the composer draws; `detail`
 * where it is, under it. */
export type Chip =
  | { plugin: typeof CHIP_PLUGIN; kind: 'card'; ref: CardRef; label: string; detail: string }
  | { plugin: typeof CHIP_PLUGIN; kind: 'note'; ref: NoteRef; label: string; detail: string }
  | { plugin: typeof CHIP_PLUGIN; kind: 'board'; ref: BoardRef; label: string; detail: string };

/** What a chip says now: `where` it is, then its `text`: one block of the bot's prompt. */
export interface ChipText { where: string; text: string }

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
export function cardChip(s: LedgerState, board: string, n: number): Chip | ChipRefusal {
  const card = cardNow(s, board, n);
  if ('refused' in card) return card;
  return {
    plugin: CHIP_PLUGIN, kind: 'card', ref: { board, n, ver: card.ver },
    label: clip(card.title, CARD_LABEL) || actionsChipsWords.card2(n), detail: actionsChipsWords.cardOnBoard(n, board),
  };
}

/** The chip for note `seq` on `board` as it stands now; a refusal when it cannot be added. */
export function noteChip(s: LedgerState, board: string, seq: number): Chip | ChipRefusal {
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
export function boardChip(s: LedgerState, board: string): Chip | ChipRefusal {
  const now = boardNow(s, board);
  if ('refused' in now) return now;
  return {
    plugin: CHIP_PLUGIN, kind: 'board', ref: { board, head: s.seq },
    label: clip(now.title, CARD_LABEL) || board, detail: actionsChipsWords.board(board),
  };
}

/** What the chip of `kind` and `ref` says now (the contract's `resolve(kind, ref)`): where it is and
 * its text, or why it is refused: gone, removed, hidden, or changed since the chip was made. A board
 * chip is never `changed`: a board always moves on, and its text is the board as it is now. */
export function resolveChip(s: LedgerState, kind: 'card', ref: CardRef): ChipText | ChipRefusal;
export function resolveChip(s: LedgerState, kind: 'note', ref: NoteRef): ChipText | ChipRefusal;
export function resolveChip(s: LedgerState, kind: 'board', ref: BoardRef): ChipText | ChipRefusal;
export function resolveChip(s: LedgerState, kind: ChipKind, ref: ChipRef): ChipText | ChipRefusal {
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
