// The person's chat message as the agent's prompt (chat-panel BE_03 ruling 5, PLAN ruling 9): the
// text, then each chip spelled out (a note's words and the cards it is on; a card's number and
// title), then the board id. The same chips go on the `message_in` event, labelled for the panel. A
// session with no board (started in the folder, panel-send ruling 2) takes no chips, and its agent
// is told no board is open and it may create one. Pure: it reads the folded ledger and refuses a
// note or card that is not on the board. Cards come and go by their board number (api.md 125).
import type { LedgerState } from '../../../packages/actions/src/index.ts';
import { eventBoard, numberOf } from '../../../packages/actions/src/index.ts';
import { latest } from '../../../packages/format/src/index.ts';
import { cardOn } from './edge.ts';
import type { PointerError } from './problem.ts';
import { problem } from './problem.ts';

export interface Chip { kind: 'note' | 'card'; ref: number; label: string }
export interface ChatMessage { text: string; notes?: number[]; cards?: number[] }

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

/** What a session on no board is told after the person's words. */
export const NO_BOARD = 'No board is open in this folder yet. If drawing would help, create one with write_board; the person\'s page opens it.';

/** The prompt and the chips for one message; `invalid` for a note or card not on `board`. */
export function promptFor(s: LedgerState, board: string | undefined, msg: ChatMessage): { prompt: string; chips: Chip[] } {
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
  const attached = lines.length ? `\n\nAttached from the board:\n${lines.join('\n')}` : '';
  return { prompt: `${msg.text}${attached}\n\nBoard: ${board}`, chips };
}

/** A message to a session on no board: the words, then that no board is open. */
function folderPrompt(msg: ChatMessage): { prompt: string; chips: Chip[] } {
  const errors: PointerError[] = [
    ...(msg.notes ?? []).map((seq, i) => ({ pointer: `/notes/${i}`, detail: `no board is open, so there is no note ${seq}` })),
    ...(msg.cards ?? []).map((n, i) => ({ pointer: `/cards/${i}`, detail: `no board is open, so there is no card ${n}` })),
  ];
  if (errors.length) throw problem('invalid', 'The message names notes or cards, but no board is open.', { errors });
  return { prompt: `${msg.text}\n\n${NO_BOARD}`, chips: [] };
}
