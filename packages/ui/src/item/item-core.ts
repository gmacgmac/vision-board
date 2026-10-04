// Item pattern, layer 1 (core): what an item is and which actions it offers. No DOM.
import type { ActionId, ViewNode } from '../../../format/src/index.ts';
import { NODE_TYPES } from '../../../format/src/index.ts';
import type { ItemStatus } from '../../../actions/src/index.ts';
import { ACTIONS } from '../../../actions/src/index.ts';

export const STATUS_LABEL: Record<ItemStatus, string> = {
  open: 'Open', acknowledged: 'Acknowledged', dropped: 'Dropped', commented: 'Commented',
  context: 'Needs context', later: 'Saved for later',
};

export const isItem = (n: ViewNode): boolean => n.n !== undefined;

/** Review buttons shown on an item; non-items offer none. */
export const offers = (n: ViewNode): ActionId[] => (isItem(n) ? [...NODE_TYPES[n.kind].actions] : []);

/** Whether an action's button shows as pressed for the current status. */
export const isPressed = (action: ActionId, status: ItemStatus): boolean =>
  ACTIONS[action].status !== undefined && ACTIONS[action].status === status;

export function itemLabel(n: ViewNode, status: ItemStatus): string {
  const num = isItem(n) ? `Item ${n.n}, ` : '';
  const st = isItem(n) ? `, ${STATUS_LABEL[status]}` : '';
  return `${num}${NODE_TYPES[n.kind].label}: ${n.title}${st}`;
}

export function buttonLabel(action: ActionId, n: ViewNode): string {
  const def = ACTIONS[action];
  return `${def.label} item ${n.n}${def.key ? ` (${def.key.toUpperCase()})` : ''}`;
}
