// Item pattern, layer 1 (core): what an item is and which actions it offers. No DOM.
import type { Kind, ViewNode } from '../../../format/src/index.ts';
import type { ActionId } from '../../../format/src/index.ts';
import type { ItemStatus } from '../../../actions/src/index.ts';
import { ACTIONS } from '../../../actions/src/index.ts';

export const KIND_LABEL: Record<Kind, string> = {
  question: 'Question', finding: 'Finding', decision: 'Decision', risk: 'Risk',
  action: 'Action', topic: 'Topic', note: 'Note',
};

export const STATUS_LABEL: Record<ItemStatus, string> = {
  open: 'Open', acknowledged: 'Acknowledged', dropped: 'Dropped', commented: 'Commented',
  context: 'Needs context', later: 'Saved for later',
};

const REVIEW: ActionId[] = ['ack', 'drop', 'comment', 'context', 'later'];
const OFFERS: Record<Kind, ActionId[]> = {
  question: REVIEW, decision: REVIEW, risk: REVIEW, action: REVIEW,
  finding: ['ack', 'comment', 'context', 'later'],
  topic: [], note: [],
};

export const isItem = (n: ViewNode): boolean => n.n !== undefined;

/** Review buttons shown on an item; non-items offer none. */
export const offers = (n: ViewNode): ActionId[] => (isItem(n) ? OFFERS[n.kind] : []);

/** Whether an action's button shows as pressed for the current status. */
export const isPressed = (action: ActionId, status: ItemStatus): boolean =>
  ACTIONS[action].status !== undefined && ACTIONS[action].status === status;

export function itemLabel(n: ViewNode, status: ItemStatus): string {
  const num = isItem(n) ? `Item ${n.n}, ` : '';
  const st = isItem(n) ? `, ${STATUS_LABEL[status]}` : '';
  return `${num}${KIND_LABEL[n.kind]}: ${n.title}${st}`;
}

export function buttonLabel(action: ActionId, n: ViewNode): string {
  const def = ACTIONS[action];
  return `${def.label} item ${n.n}${def.key ? ` (${def.key.toUpperCase()})` : ''}`;
}
