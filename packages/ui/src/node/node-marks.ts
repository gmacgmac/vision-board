// Node pattern, layer 1 (core), the marks on the node's edges (D-099, decisions 4 to 7, 12, 17):
// what the number, the answer, the change badge and the notes mark show, and the node's icon and tone, worked out
// from the board state and the conditions the page passes in. No DOM; the template
// draws them and the element applies them in place. The keys come from the action registry; History's (H) is the
// node's own, since history is no act.
import type { ViewNode } from '#format';
import { isTone, NODE_TYPES } from '#format';
import type { ItemStatus } from '#actions';
import { ACTIONS } from '#actions';
import type { CardReply } from './node-notes.ts';
import type { ItemNote } from '#actions';
import type { UpdatesView } from './node-updates.ts';
import { writtenTime } from './node-time.ts';
import * as nodeWords from '../words/node.ts';

/** The key that opens a node's history (planner's call 3): no act, so not in the action registry. */
export const HISTORY_KEY = 'h';

/** The keys as the names and menus show them. */
export const MARK_KEYS = {
  tick: ACTIONS.ack.key!.toUpperCase(), cross: ACTIONS.drop.key!.toUpperCase(), comment: ACTIONS.comment.key!.toUpperCase(),
  bookmark: ACTIONS.bookmark.key!.toUpperCase(), later: ACTIONS.later.key!.toUpperCase(), history: HISTORY_KEY.toUpperCase(), putBack: 'R',
} as const;

/** The answer (DD-07): none on a node that only tells; waiting, ticked or crossed on one that asks. */
export type AnswerMark = 'none' | 'waiting' | 'ticked' | 'crossed';
/** The notes mark (DD-05): quiet with none, a count, filled while an agent's reply is unread. */
export type NotesMark = 'none' | 'count' | 'unread';
/** The change badge (DD-06): none on a node that never changed (without a written time), New, "N updates", then a quiet "vN" once seen. */
export type BadgeMark = 'none' | 'new' | 'updates' | 'settled';

/** A tone as the element applies it (T_02): `data-vb-tone` is the name or `hue`, and `--vb-tone-h` the name's hue
 *  token or the checked number. Never text from the node: a name is one of `TONES`, a hue a whole number. */
export interface ToneView { attr: string; hue: string }

export interface NodeMarks {
  /** The number's toggle: pressed while bookmarked; its name stays put. */
  bookmarked: boolean;
  numberLabel: string;
  answer: AnswerMark;
  answerLabel: string;
  /** An open proposal's answer (DESIGN_01): the disc's dashed ring and the mark proposed, or the plate's chip and the
   *  switch's half outlined. */
  proposed?: 'ack' | 'drop';
  /** The plate's proposal chip's name, empty with no proposal. */
  proposalLabel: string;
  notes: NotesMark;
  /** What the notes mark shows: empty with none, the count, "99+" past it. */
  notesText: string;
  notesLabel: string;
  /** A note on several nodes is among them: the two-bubble glyph. */
  group: boolean;
  badge: BadgeMark;
  badgeText: string;
  badgeLabel: string;
  /** The badge's tip: when the agent last wrote the card, then the label; empty without a written time (the badge keeps its own tip). */
  badgeTip: string;
  /** The handover is owed: the quiet Awaiting tab after the badge. */
  awaiting: boolean;
}

/** The node's tone as the element applies it; undefined with none or with anything that is not a tone. */
export function toneView(tone: unknown): ToneView | undefined {
  if (!isTone(tone)) return undefined;
  return typeof tone === 'number' ? { attr: 'hue', hue: String(tone) } : { attr: tone, hue: `var(--vb-tone-hue-${tone})` };
}

const ANSWER: Partial<Record<ItemStatus, AnswerMark>> = { acknowledged: 'ticked', dropped: 'crossed' };
const ANSWER_WORD: Record<Exclude<AnswerMark, 'none'>, string> = {
  waiting: nodeWords.answerWaiting, ticked: nodeWords.answerTicked, crossed: nodeWords.answerCrossed,
};

/** What the marks need besides the node: its status, its notes and the replies as the card shows them, whether it is
 *  bookmarked, new, its updates, its latest version (`ver`, the settled badge), an open proposal and Awaiting. */
export interface MarksInput {
  status: ItemStatus; notes: readonly ItemNote[]; replies?: readonly CardReply[];
  bookmarked: boolean; fresh: boolean; updates?: UpdatesView; ver?: number; written?: { at: string; agent?: string }; proposed?: 'ack' | 'drop'; awaiting: boolean;
}

/** The change badge: New first, then the unseen updates, then the version once seen (from v2, or from v1 with a
 *  written time: a node that never changed has none without it). An app card keeps the v2 rule: its window's bar has
 *  no room for a v1 badge beside the app's name at its least width. */
function badgeOf(n: ViewNode, m: MarksInput): Pick<NodeMarks, 'badge' | 'badgeText' | 'badgeLabel' | 'badgeTip'> {
  const [badge, text]: [BadgeMark, string] = m.fresh ? ['new', nodeWords.badgeNew]
    : m.updates?.tab ? ['updates', m.updates.tab]
      : m.ver !== undefined && (m.ver > 1 || (m.written && n.kind !== 'app')) ? ['settled', nodeWords.badgeSettled(m.ver)] : ['none', ''];
  const label = badge === 'none' ? '' : nodeWords.badgeItem(text, n.n, MARK_KEYS.history);
  const when = m.written ? `${nodeWords.badgeWritten(writtenTime(m.written.at), m.written.agent)}\n` : '';
  return { badge, badgeText: text, badgeLabel: label, badgeTip: label && when ? `${when}${label}` : '' };
}

/** The notes mark: every note on the node (one on several nodes counts on each) and every reply to them. */
function notesOf(n: ViewNode, m: MarksInput): Pick<NodeMarks, 'notes' | 'notesText' | 'notesLabel' | 'group'> {
  const k = m.notes.length + (m.replies?.length ?? 0);
  const unread = m.replies?.some((r) => r.unseen) === true;
  const notes: NotesMark = unread ? 'unread' : k ? 'count' : 'none';
  return {
    notes, notesText: k === 0 ? '' : k > 99 ? nodeWords.manyNotes : String(k), group: m.notes.some((x) => x.nodes !== undefined),
    notesLabel: nodeWords.notesOnItem(k, n.n, unread, MARK_KEYS.comment),
  };
}

/** Everything the edge marks show for a node. */
export function nodeMarks(n: ViewNode, m: MarksInput): NodeMarks {
  const asks = n.n !== undefined && NODE_TYPES[n.kind].answer;
  const answer: AnswerMark = asks ? ANSWER[m.status] ?? 'waiting' : 'none';
  const proposed = asks ? m.proposed : undefined;
  const offer = proposed === 'ack' ? nodeWords.proposedTick : proposed === 'drop' ? nodeWords.proposedCross : '';
  return {
    bookmarked: m.bookmarked, numberLabel: nodeWords.bookmarkItem(n.n, MARK_KEYS.bookmark),
    answer, answerLabel: answer === 'none' ? '' : nodeWords.answerItem(n.n, ANSWER_WORD[answer], MARK_KEYS.tick, MARK_KEYS.cross) + offer,
    ...(proposed && { proposed }), proposalLabel: proposed ? nodeWords.proposalItem(n.n, offer) : '',
    ...notesOf(n, m), ...badgeOf(n, m), awaiting: m.awaiting,
  };
}

/** What the page says beside a pressed mark (FE_02, mark-tips.ts): a write that did not save, a press on a locked board
 *  or a read-only ledger. The words live here, in the node's words file; the page shows them. */
export const MARK_MOMENT_WORDS = {
  tickNotSaved: nodeWords.tickNotSaved, crossNotSaved: nodeWords.crossNotSaved,
  boardIsLocked: nodeWords.boardIsLocked, ledgerIsReadOnly: nodeWords.ledgerIsReadOnly,
} as const;
