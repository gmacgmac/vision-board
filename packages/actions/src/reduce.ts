// Folds the transcript into the current state of the board: item statuses, notes, the person's
// pins and layout choices. Last record wins; nothing is ever removed from the transcript.
// The item rules (`applyItem`) and the state types moved to fold.ts, the ledger's fold (BE_01).
import type { TranscriptRecord } from '../../format/src/index.ts';
import type { View } from '../../format/src/index.ts';
import type { ItemStatus } from './registry.ts';
import { DECIDED } from './registry.ts';
import type { BoardState } from './fold.ts';
import { applyItem } from './fold.ts';

export function reduceTranscript(records: TranscriptRecord[]): BoardState {
  const s: BoardState = { items: new Map(), pins: new Map(), modes: new Map() };
  for (const r of records) {
    if (r.action === 'pin' && r.node) s.pins.set(r.node, { x: r.x!, y: r.y! });
    else if (r.action === 'unpin' && r.node) s.pins.delete(r.node);
    else if (r.action === 'mode' && r.region && r.mode) s.modes.set(r.region, r.mode);
    else if (r.node) s.items.set(r.node, applyItem(s.items.get(r.node), r.action, r.text, r.at));
  }
  return s;
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
