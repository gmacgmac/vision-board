// Folds the transcript into the current state of the board: item statuses, notes, the person's
// pins and layout choices. Last record wins; nothing is ever removed from the transcript.
import type { TranscriptRecord } from '../../format/src/index.ts';
import type { Mode, View } from '../../format/src/index.ts';
import type { ItemStatus } from './registry.ts';
import { ACTIONS, DECIDED } from './registry.ts';

export interface ItemNote { kind: 'comment' | 'context'; text: string; at: string }
export interface ItemState { status: ItemStatus; notes: ItemNote[] }

export interface BoardState {
  items: Map<string, ItemState>;
  pins: Map<string, { x: number; y: number }>;
  modes: Map<string, Mode>;
}

export function reduceTranscript(records: TranscriptRecord[]): BoardState {
  const s: BoardState = { items: new Map(), pins: new Map(), modes: new Map() };
  for (const r of records) {
    if (r.action === 'pin' && r.node) s.pins.set(r.node, { x: r.x!, y: r.y! });
    else if (r.action === 'unpin' && r.node) s.pins.delete(r.node);
    else if (r.action === 'mode' && r.region && r.mode) s.modes.set(r.region, r.mode);
    else if (r.node) applyItem(s, r);
  }
  return s;
}

function applyItem(s: BoardState, r: TranscriptRecord) {
  const item = s.items.get(r.node!) ?? { status: 'open' as ItemStatus, notes: [] };
  const def = ACTIONS[r.action];
  if ((r.action === 'comment' || r.action === 'context') && r.text?.trim())
    item.notes.push({ kind: r.action, text: r.text.trim(), at: r.at });
  if (def.status) item.status = def.status;
  else if (r.action === 'comment' && item.status === 'open') item.status = 'commented';
  s.items.set(r.node!, item);
}

export const statusOf = (s: BoardState, id: string): ItemStatus => s.items.get(id)?.status ?? 'open';

export function counts(view: View, s: BoardState) {
  const items = view.nodes.filter((n) => n.n !== undefined);
  const st = items.map((n) => statusOf(s, n.id));
  return {
    total: items.length,
    decided: st.filter((x) => DECIDED.has(x)).length,
    later: st.filter((x) => x === 'later').length,
    open: st.filter((x) => !DECIDED.has(x) && x !== 'later').length,
  };
}
