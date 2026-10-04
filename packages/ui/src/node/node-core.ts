// Node pattern, layer 1 (core): what a node shows and which actions it offers. No DOM, so
// every rule here is unit-tested under plain Node; the element only applies the result.
import type { ActionId, ViewNode } from '../../../format/src/index.ts';
import { NODE_TYPES } from '../../../format/src/index.ts';
import type { BoardState, ItemStatus } from '../../../actions/src/index.ts';
import { ACTIONS, statusOf } from '../../../actions/src/index.ts';

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

export function nodeLabel(n: ViewNode, status: ItemStatus): string {
  const num = isItem(n) ? `Item ${n.n}, ` : '';
  const st = isItem(n) ? `, ${STATUS_LABEL[status]}` : '';
  return `${num}${NODE_TYPES[n.kind].label}: ${n.title}${st}`;
}

export function buttonLabel(action: ActionId, n: ViewNode): string {
  const def = ACTIONS[action];
  return `${def.label} item ${n.n}${def.key ? ` (${def.key.toUpperCase()})` : ''}`;
}

/** Everything a drawn node shows for the person's current state; `update()` applies it. */
export interface NodeState {
  status: ItemStatus;
  pinned: boolean;
  /** The node's accessible name: number, kind, title and (for items) status. */
  label: string;
  /** The status word in the head; empty for open items and for non-items. */
  statusWord: string;
  /** The last note, led by who wrote it; absent when the node has no notes. */
  noteLine?: string;
  /** aria-pressed for each offered action. */
  pressed: Partial<Record<ActionId, boolean>>;
}

export function nodeState(n: ViewNode, s: BoardState): NodeState {
  const status = statusOf(s, n.id);
  const pressed: Partial<Record<ActionId, boolean>> = {};
  for (const a of offers(n)) pressed[a] = isPressed(a, status);
  const notes = s.items.get(n.id)?.notes ?? [];
  const last = notes[notes.length - 1];
  const lead = last?.kind === 'context' ? 'Asked for context' : 'You';
  return {
    status,
    pinned: s.pins.has(n.id),
    label: nodeLabel(n, status),
    statusWord: isItem(n) && status !== 'open' ? STATUS_LABEL[status] : '',
    ...(last ? { noteLine: `${notes.length > 1 ? `${notes.length} notes · ` : ''}${lead}: ${last.text}` } : {}),
    pressed,
  };
}
