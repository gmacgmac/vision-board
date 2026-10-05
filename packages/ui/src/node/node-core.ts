// Node pattern, layer 1 (core): what a node shows and which actions it offers. No DOM, so
// every rule here is unit-tested under plain Node; the element only applies the result.
import type { ActionId, NodeSize, ViewNode } from '../../../format/src/index.ts';
import { NODE_TYPES } from '../../../format/src/index.ts';
import type { BoardState, ItemNote, ItemStatus } from '../../../actions/src/index.ts';
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

/** The accessible name; `selected` adds ", selected" last (3_FE_01 ruling 9, mockup 05), since a
 *  list item can carry no aria-selected and the selection must be perceivable without colour. */
export function nodeLabel(n: ViewNode, status: ItemStatus, selected = false): string {
  const num = isItem(n) ? `Item ${n.n}, ` : '';
  const st = isItem(n) ? `, ${STATUS_LABEL[status]}` : '';
  return `${num}${NODE_TYPES[n.kind].label}: ${n.title}${st}${selected ? ', selected' : ''}`;
}

export function buttonLabel(action: ActionId, n: ViewNode): string {
  const def = ACTIONS[action];
  return `${def.label} item ${n.n}${def.key ? ` (${def.key.toUpperCase()})` : ''}`;
}

/** One of the person's notes in the card's "Your note" block (2e_FE_01 ruling 7). `index` is its
 * pin number: its place among the card's notes, in the order they were made. */
export interface NoteEntry { seq: number; index: number; who: string; text: string; sent: boolean }

/** The card's notes: the numbered pin on its top-right corner (the latest note, the one a press
 * of C or M or a click opens) and the block in its body, latest first, with "N notes" over it
 * when there are several. */
export interface NotesView {
  count?: string;
  entries: NoteEntry[];
  pin: { seq: number; index: number; sent: boolean; label: string };
}

const KIND_WORD: Record<ItemNote['kind'], string> = { comment: 'Your note', context: 'More context' };

/** The block and pin for an item's notes; undefined with none. */
export function notesView(n: ViewNode, notes: readonly ItemNote[]): NotesView | undefined {
  if (!notes.length) return undefined;
  const entries = notes.map((x, i): NoteEntry => ({
    seq: x.seq, index: i + 1, sent: x.sent === true, text: x.text,
    who: `${KIND_WORD[x.kind]} ${i + 1}${x.sent ? ' · Sent' : ''}`,
  })).reverse();
  const top = entries[0]!;
  const label = top.sent ? `Note ${top.index} on item ${n.n}, sent. Show it` : `Note ${top.index} on item ${n.n}. Edit it`;
  return {
    ...(notes.length > 1 && { count: `${notes.length} notes` }),
    entries, pin: { seq: top.seq, index: top.index, sent: top.sent, label },
  };
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
  /** In the person's selection (3_FE_01): view state the page passes in, never a ledger fact. */
  selected: boolean;
  /** The node's accessible name: number, kind, title, (for items) status, and "selected". */
  label: string;
  /** The status word in the footer, "Open" included; empty for non-items. */
  statusWord: string;
  /** The person's notes: the pin and the "Your note" block; absent with no notes. */
  notes?: NotesView;
  /** aria-pressed for each offered action. */
  pressed: Partial<Record<ActionId, boolean>>;
  /** The card's size tier and control; absent unless the page passed a tier (the nodeSize flag). */
  size?: SizeState;
}

/** `tier` comes from the page (`sizeTier` in packages/layout, which this layer may not import), and
 *  so does `selected` (the page's selection module, 3_FE_01). */
export function nodeState(n: ViewNode, s: BoardState, tier?: NodeSize, selected = false): NodeState {
  const status = statusOf(s, n.id);
  const pressed: Partial<Record<ActionId, boolean>> = {};
  for (const a of offers(n)) pressed[a] = isPressed(a, status);
  const notes = notesView(n, s.items.get(n.id)?.notes ?? []);
  const picked = s.sizes.has(n.id);
  return {
    status,
    pinned: s.pins.has(n.id),
    selected,
    label: nodeLabel(n, status, selected),
    statusWord: isItem(n) ? STATUS_LABEL[status] : '',
    ...(notes && { notes }),
    pressed,
    ...(tier ? { size: { tier, picked, label: sizeLabel({ tier, picked }), shown: picked ? `◆ ${SIZE_LETTER[tier]}` : '' } } : {}),
  };
}
