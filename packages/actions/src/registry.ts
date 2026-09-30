// Every thing a person or agent can do on the board, declared once (project rule 8).
import type { ActionId } from '../../format/src/transcript.ts';

export type ItemStatus = 'open' | 'acknowledged' | 'dropped' | 'commented' | 'context' | 'later';
export const DECIDED: ReadonlySet<ItemStatus> = new Set(['acknowledged', 'dropped']);

export interface ActionDef {
  id: ActionId;
  label: string;
  /** Keyboard shortcut while an item has focus. */
  key?: string;
  /** Only a person may take it: it is a decision. */
  personOnly: boolean;
  /** Acts on a numbered item. */
  onItem: boolean;
  text?: 'required' | 'optional';
  /** Status the item moves to. */
  status?: ItemStatus;
  /** How it reads in the numbered reply. */
  reply?: string;
}

export const ACTIONS: Record<ActionId, ActionDef> = {
  ack: { id: 'ack', label: 'Acknowledge', key: 'a', personOnly: true, onItem: true, status: 'acknowledged', reply: 'ok' },
  drop: { id: 'drop', label: 'Drop', key: 'x', personOnly: true, onItem: true, status: 'dropped', reply: 'drop' },
  comment: { id: 'comment', label: 'Comment', key: 'c', personOnly: false, onItem: true, text: 'required', reply: 'comment' },
  context: { id: 'context', label: 'More context', key: 'm', personOnly: false, onItem: true, text: 'optional', status: 'context', reply: 'more context' },
  later: { id: 'later', label: 'Save for later', key: 'l', personOnly: true, onItem: true, status: 'later', reply: 'later' },
  reopen: { id: 'reopen', label: 'Reopen', key: 'o', personOnly: true, onItem: true, status: 'open' },
  pin: { id: 'pin', label: 'Move', personOnly: true, onItem: false },
  unpin: { id: 'unpin', label: 'Reset position', personOnly: true, onItem: false },
  mode: { id: 'mode', label: 'Change layout', personOnly: true, onItem: false },
};

/** The review buttons an item offers. */
export const ITEM_ACTIONS: readonly ActionId[] = ['ack', 'drop', 'comment', 'context', 'later'];
