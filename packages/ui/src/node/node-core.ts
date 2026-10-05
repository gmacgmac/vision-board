// Node pattern, layer 1 (core): what a node shows and which actions it offers. No DOM, so
// every rule here is unit-tested under plain Node; the element only applies the result.
import type { ActionId, NodeSize, ViewNode } from '../../../format/src/index.ts';
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

/** The note block on a card: a small heading naming who, then the last note's text. */
export interface NoteLine {
  who: string;
  text: string;
}

/** The size control's state (D-030): the card's tier, whether the person picked it, the trigger's
 *  label, and what the trigger shows in place of the glyph ("◆ S" for a pick, empty otherwise). */
export interface SizeState {
  tier: NodeSize;
  picked: boolean;
  label: string;
  shown: string;
}

export const SIZE_LETTER: Record<NodeSize, string> = { s: 'S', m: 'M', l: 'L' };

export const sizeLabel = (v: { tier: NodeSize; picked: boolean }): string =>
  `Card size: ${SIZE_LETTER[v.tier]}, ${v.picked ? 'your pick' : 'automatic'}. Change size`;

/** Everything a drawn node shows for the person's current state; `update()` applies it. */
export interface NodeState {
  status: ItemStatus;
  pinned: boolean;
  /** The node's accessible name: number, kind, title and (for items) status. */
  label: string;
  /** The status word in the footer, "Open" included; empty for non-items. */
  statusWord: string;
  /** The last note and who it is from (with the count when there are several); absent with no notes. */
  note?: NoteLine;
  /** aria-pressed for each offered action. */
  pressed: Partial<Record<ActionId, boolean>>;
  /** The card's size tier and control; absent unless the page passed a tier (the nodeSize flag). */
  size?: SizeState;
}

/** `tier` comes from the page (`sizeTier` in packages/layout, which this layer may not import). */
export function nodeState(n: ViewNode, s: BoardState, tier?: NodeSize): NodeState {
  const status = statusOf(s, n.id);
  const pressed: Partial<Record<ActionId, boolean>> = {};
  for (const a of offers(n)) pressed[a] = isPressed(a, status);
  const notes = s.items.get(n.id)?.notes ?? [];
  const last = notes[notes.length - 1];
  const lead = last?.kind === 'context' ? 'You asked for more context' : 'Your note';
  const picked = s.sizes.has(n.id);
  return {
    status,
    pinned: s.pins.has(n.id),
    label: nodeLabel(n, status),
    statusWord: isItem(n) ? STATUS_LABEL[status] : '',
    ...(last ? { note: { who: `${notes.length > 1 ? `${notes.length} notes · ` : ''}${lead}`, text: last.text } } : {}),
    pressed,
    ...(tier ? { size: { tier, picked, label: sizeLabel({ tier, picked }), shown: picked ? `◆ ${SIZE_LETTER[tier]}` : '' } } : {}),
  };
}
