// The person's chat message as the agent's prompt (chat-panel BE_03 ruling 5, PLAN ruling 9): the
// words, then the files the person attached (D-068: by path, "The person attached these files:"), then
// what it carries from the board (packages/actions `boardBlocks`, the one writer the
// page's composer preview reads too, composer-one-chip ruling 2): the cards the person selected,
// "The person selected these cards:", right after the words (ruling 3), then any note chip spelled
// out (its words and the cards it is on), then the board's answers since the agent was last told
// (`turnOf`), then the board id: one message for all of it (chat-board-context ruling 2), the one
// builder of it. A note that is one of those answers is sent once, there: its chip and its line are
// left out (chat-no-double-note ruling 3); a card stays, with nothing of its answer (ruling 4). The
// `message_in` shows the words and the answers, with the chips labelled for the panel; with neither,
// `ONLY_ATTACHED`. A session with no board (started in the folder, panel-send ruling 2) takes no
// chips, and its agent is told no board is open and it may create one. Pure: each card and note is
// made a chip and read back as the engine's `resolve` reads it (packages/actions `cardChip`,
// `noteChip`, `resolveChip`), so a card or note that is not on the board, was removed, or is hidden
// is refused with the chip's reason. Cards come and go by their board number (api.md 125).
import type { Chip as BoardChip, ChipRefusal, LedgerState, Round, SelectedCard } from '#actions';
import { boardBlocks, cardChip, noteChip, resolveChip } from '#actions';
import type { AttachedFile } from './chat-files.ts';
import type { PointerError } from './problem.ts';
import { problem } from './problem.ts';
import * as serverChatWords from './words/server-chat.ts';

/** A chip as the `message_in` carries it for the panel: the card's number or the note's `seq`. */
export interface Chip { kind: 'note' | 'card'; ref: number; label: string }
/** The person's message: words (none when it is only what is attached, api.md 131), notes, cards, and
 * files, each already checked (`attachedFile`), so a path a page made up never gets this far. */
export interface ChatMessage { text?: string; notes?: number[]; cards?: number[]; files?: AttachedFile[] }
/** One message as built: the agent's prompt, and the `message_in`'s words and chips. */
export interface BuiltMessage { prompt: string; text: string; chips: Chip[] }

/** A refusal's reason as a pointer error's detail, which starts lower case with no full stop. */
const detailOf = (r: ChipRefusal): string => `${r.reason.charAt(0).toLowerCase()}${r.reason.slice(1).replace(/\.$/, '')}`;

/** What a chip just made says now: its text. */
function textOf(s: LedgerState, chip: BoardChip): string {
  const now = chip.kind === 'card' ? resolveChip(s, 'card', chip.ref) : chip.kind === 'note' ? resolveChip(s, 'note', chip.ref) : resolveChip(s, 'board', chip.ref);
  return 'refused' in now ? '' : now.text;
}

/** The heading of the notes a message names (an older client's note chips; the page sends none). */
export const NOTES_HEAD = serverChatWords.attachedFromTheBoard;

/** The `message_in`'s words when the person sent cards or notes alone, with no words or answers. */
export const ONLY_ATTACHED = serverChatWords.attachedFromTheBoard2;

/** The `message_in`'s words when the person sent files alone. */
export const ONLY_FILES = serverChatWords.attachedFiles;

/** The block naming the attached files, one relative path a line; '' with none. */
export const filesBlock = (msg: ChatMessage): string =>
  (msg.files?.length ? `${serverChatWords.thePersonAttachedTheseFiles}\n${msg.files.map((f) => f.path).join('\n')}\n${serverChatWords.attachedFilesAreUntrusted}` : '');

/** The person's words, when there are any. */
export const wordsOf = (msg: ChatMessage): string => (msg.text?.trim() ? msg.text : '');

/** What a session on no board is told after the person's words. */
export const NO_BOARD = serverChatWords.noBoardIsOpenIn;

/** One message: the words, the files, the selected cards, the notes, the board's answers (`round`) and the board; `invalid` for a
 * note or card a chip refuses (not on `board`, removed, or a hidden note), with its reason. A note among the `round`'s
 * answers is checked, then left out. */
export function promptFor(s: LedgerState, board: string | undefined, msg: ChatMessage, round?: Round): BuiltMessage {
  if (board === undefined) return folderPrompt(msg);
  const errors: PointerError[] = [];
  const chips: Chip[] = [];
  const lines: string[] = [];
  const cards: SelectedCard[] = [];
  (msg.notes ?? []).forEach((seq, i) => {
    const chip = noteChip(s, board, seq);
    if ('refused' in chip) return void errors.push({ pointer: `/notes/${i}`, detail: detailOf(chip) });
    if (round?.notes.has(seq)) return;
    lines.push(`- ${chip.detail}: ${textOf(s, chip)}`);
    chips.push({ kind: 'note', ref: seq, label: chip.label });
  });
  (msg.cards ?? []).forEach((n, i) => {
    const chip = cardChip(s, board, n);
    if ('refused' in chip) return void errors.push({ pointer: `/cards/${i}`, detail: detailOf(chip) });
    cards.push({ n, title: textOf(s, chip) });
    chips.push({ kind: 'card', ref: n, label: chip.label });
  });
  if (errors.length) throw problem('invalid', serverChatWords.theMessageNamesNotesOr, { errors });
  const words = wordsOf(msg);
  const attached = lines.length ? `${NOTES_HEAD}\n${lines.join('\n')}` : '';
  const prompt = [words, filesBlock(msg), boardBlocks(cards, round, attached), serverChatWords.board(board)].filter(Boolean).join('\n\n');
  const only = msg.files?.length && !chips.length ? ONLY_FILES : ONLY_ATTACHED;
  return { prompt, text: [words, round?.text].filter(Boolean).join('\n\n') || only, chips };
}

/** A message to a session on no board: the words, the files, then that no board is open. */
function folderPrompt(msg: ChatMessage): BuiltMessage {
  const errors: PointerError[] = [
    ...(msg.notes ?? []).map((seq, i) => ({ pointer: `/notes/${i}`, detail: serverChatWords.noBoardIsOpenSo(seq) })),
    ...(msg.cards ?? []).map((n, i) => ({ pointer: `/cards/${i}`, detail: serverChatWords.noBoardIsOpenSoThere(n) })),
  ];
  if (errors.length) throw problem('invalid', serverChatWords.theMessageNamesNotesOrCards, { errors });
  return { prompt: [wordsOf(msg), filesBlock(msg), NO_BOARD].filter(Boolean).join('\n\n'), text: wordsOf(msg) || ONLY_FILES, chips: [] };
}
