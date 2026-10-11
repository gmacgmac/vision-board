// The person's chat message as the agent's prompt (chat-panel BE_03 ruling 5, PLAN ruling 9): the
// words, then each chip spelled out (a note's words and the cards it is on; a card's number and
// title), then the board's answers since the agent was last told (chat-round.ts `roundOf`), then
// the board id: one message for all of it (chat-board-context ruling 2), the one builder of it. A
// note that is one of those answers is sent once, there: its chip and its line under "Attached" are
// left out (chat-no-double-note ruling 3); a card stays, with nothing of its answer (ruling 4). The
// `message_in` shows the words and the answers, with the chips labelled for the panel; with neither,
// `ONLY_ATTACHED`. A session with no board (started in the folder, panel-send ruling 2) takes no
// chips, and its agent is told no board is open and it may create one. Pure: it reads the folded
// ledger and refuses a note or card that is not on the board. Cards come and go by their board
// number (api.md 125).
import type { LedgerState } from '../../../packages/actions/src/index.ts';
import { eventBoard, numberOf } from '../../../packages/actions/src/index.ts';
import { latest } from '../../../packages/format/src/index.ts';
import { cardOn } from './edge.ts';
import type { Round } from './chat-round.ts';
import type { PointerError } from './problem.ts';
import { problem } from './problem.ts';

export interface Chip { kind: 'note' | 'card'; ref: number; label: string }
/** The person's message: words (none when it is only what is attached, api.md 131), notes, cards. */
export interface ChatMessage { text?: string; notes?: number[]; cards?: number[] }
/** One message as built: the agent's prompt, and the `message_in`'s words and chips. */
export interface BuiltMessage { prompt: string; text: string; chips: Chip[] }

const LABEL_MAX = 200;
const NOTE_LABEL = 80;
const clip = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
};

/** Card `n`'s title on `board`, or undefined when the board has no card `n` on it now. */
function titleOf(s: LedgerState, board: string, n: number): string | undefined {
  const id = cardOn(s, board, n);
  const node = id === undefined ? undefined : s.nodes.get(id);
  return node && node.retired === undefined ? latest(node).title : undefined;
}

/** A note's card (its identity) as the prompt names it: board number and title. */
const cardLine = (s: LedgerState, board: string, id: number) => {
  const node = s.nodes.get(id);
  return `card ${numberOf(s, id)} "${node ? latest(node).title : '?'}"`;
};

/** The `message_in`'s words when the person sent cards or notes alone, with no words or answers. */
export const ONLY_ATTACHED = 'Attached from the board.';

/** The person's words, when there are any. */
export const wordsOf = (msg: ChatMessage): string => (msg.text?.trim() ? msg.text : '');

/** What a session on no board is told after the person's words. */
export const NO_BOARD = 'No board is open in this folder yet. If drawing would help, create one with write_board; the person\'s page opens it.';

/** One message: the words, the chips, the board's answers (`round`) and the board; `invalid` for a
 * note or card not on `board`. A note among the `round`'s answers is checked, then left out. */
export function promptFor(s: LedgerState, board: string | undefined, msg: ChatMessage, round?: Round): BuiltMessage {
  if (board === undefined) return folderPrompt(msg);
  const errors: PointerError[] = [];
  const chips: Chip[] = [];
  const lines: string[] = [];
  (msg.notes ?? []).forEach((seq, i) => {
    const ask = s.asks.get(seq);
    const act = s.acts.find((e) => e.seq === seq);
    if (!ask?.text || ask.removed !== undefined || !act || eventBoard(s, act) !== board) {
      errors.push({ pointer: `/notes/${i}`, detail: `there is no note ${seq} on board "${board}"` });
      return;
    }
    if (round?.notes.has(seq)) return;
    const on = ask.region !== undefined
      ? `container "${ask.region}"`
      : (ask.nodes ?? [ask.id]).map((id) => cardLine(s, board, id)).join(', ');
    lines.push(`- Note ${seq} on ${on}: ${ask.text}`);
    chips.push({ kind: 'note', ref: seq, label: clip(ask.text, NOTE_LABEL) });
  });
  (msg.cards ?? []).forEach((n, i) => {
    const title = titleOf(s, board, n);
    if (title === undefined) {
      errors.push({ pointer: `/cards/${i}`, detail: `there is no card ${n} on board "${board}"` });
      return;
    }
    lines.push(`- Card ${n}: ${title}`);
    chips.push({ kind: 'card', ref: n, label: clip(title, LABEL_MAX) || `Card ${n}` });
  });
  if (errors.length) throw problem('invalid', 'The message names notes or cards that are not on this board.', { errors });
  const words = wordsOf(msg);
  const attached = lines.length ? `Attached from the board:\n${lines.join('\n')}` : '';
  const prompt = [words, attached, round?.text, `Board: ${board}`].filter(Boolean).join('\n\n');
  return { prompt, text: [words, round?.text].filter(Boolean).join('\n\n') || ONLY_ATTACHED, chips };
}

/** A message to a session on no board: the words, then that no board is open. */
function folderPrompt(msg: ChatMessage): BuiltMessage {
  const errors: PointerError[] = [
    ...(msg.notes ?? []).map((seq, i) => ({ pointer: `/notes/${i}`, detail: `no board is open, so there is no note ${seq}` })),
    ...(msg.cards ?? []).map((n, i) => ({ pointer: `/cards/${i}`, detail: `no board is open, so there is no card ${n}` })),
  ];
  if (errors.length) throw problem('invalid', 'The message names notes or cards, but no board is open.', { errors });
  return { prompt: `${wordsOf(msg)}\n\n${NO_BOARD}`, text: wordsOf(msg), chips: [] };
}
