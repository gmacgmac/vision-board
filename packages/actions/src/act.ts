// Checks a person's or agent's `act` event against the action registry and the folded ledger.
// The server runs it before appending; the browser before sending. One rule set, both ends.
import type { ActEvent } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { latest } from './fold.ts';
import { ACTIONS } from './registry.ts';

export function validateAct(e: ActEvent, s: LedgerState): string[] {
  const def = ACTIONS[e.action];
  if (!def) return [`action: unknown "${String(e.action)}"`];
  const p: string[] = [];
  if (def.personOnly && e.by !== 'person') p.push(`${e.action}: only the person can do this`);
  if (e.action === 'mode') {
    if (!s.boards.get(e.board!)?.regions.some((r) => r.id === e.region))
      p.push(`region: unknown "${String(e.region)}"`);
    return p;
  }
  const node = e.n === undefined ? undefined : s.nodes.get(e.n);
  if (!node) p.push(`n: unknown node ${String(e.n)}`);
  else if (def.onItem && !latest(node).item) p.push(`n: node ${e.n} is not a numbered item`);
  if (def.text === 'required' && !e.text?.trim()) p.push('text: required');
  return p;
}
