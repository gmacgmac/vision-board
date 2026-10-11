// What a chat message carries from the board (composer-one-chip rulings 2, 3), the one writer of it:
// the server's prompt (apps/board/server/chat-prompt.ts `promptFor`) and the page's preview (the
// composer's chip, apps/board/src/board/chat-bridge.ts) are both built here. First the cards the person
// selected, "The person selected these cards:", right after their words, so "these" means the
// selection; then the board's answers since the agent was last told (the Send message, panel-send
// ruling 1: "The person updated the board:", the numbered reply of `replyLines`, the head it covers),
// with the notes its lines carry, so a message attaches none of them again (chat-no-double-note).
// Pure: from the folded ledger.
import { boardView } from '../../format/src/index.ts';
import { boardState } from './board-state.ts';
import type { LedgerState } from './fold.ts';
import { replyScope } from './pending.ts';
import { joinReply, replyLines } from './reply.ts';

export const ROUND_HEAD = 'The person updated the board:';
export const SELECTED_HEAD = 'The person selected these cards:';

/** A round: its text, how many answer lines it has, and the `seq` of the notes those lines carry. */
export interface Round { text: string; count: number; notes: ReadonlySet<number> }

/** The round on `board` after `since`, as `agent` reads it, up to the ledger's latest line;
 * undefined when the person answered nothing there since that `agent` may read. */
export function roundOf(s: LedgerState, board: string, since: number, agent?: string): Round | undefined {
  const scope = replyScope(s, board, since, agent);
  if (scope.cards.size === 0 && scope.regions.size === 0) return undefined;
  const r = replyLines(boardView(s, board), boardState(s, board), scope);
  const head = `These are the person's answers up to head ${s.seq}. To read anything newer, call check_responses on board "${board}" with after ${s.seq}.`;
  return { text: [ROUND_HEAD, joinReply(r), head].join('\n'), count: r.lines.length, notes: new Set(r.notes) };
}

/** A selected card as the message names it: its board number and title. */
export interface SelectedCard { n: number; title: string }

/** The selection block: the heading, then one line per card in the order selected; '' with none. */
export const selectionText = (cards: readonly SelectedCard[]): string =>
  (cards.length ? [SELECTED_HEAD, ...cards.map((c) => `- Card ${c.n}: ${c.title}`)].join('\n') : '');

/** Everything the message carries from the board, its blocks apart by a blank line: the selection,
 * then `attached` (notes an older client still names, chat-prompt.ts), then the round. */
export const boardBlocks = (cards: readonly SelectedCard[], round?: Round, attached = ''): string =>
  [selectionText(cards), attached, round?.text].filter(Boolean).join('\n\n');
