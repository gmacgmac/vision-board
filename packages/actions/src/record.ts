// Checks a transcript record against the action registry and the view it refers to. The server
// runs this before appending; the browser runs it before sending. One rule set, both ends.
import { ACTION_IDS } from '../../format/src/index.ts';
import type { TranscriptRecord } from '../../format/src/index.ts';
import { MODES } from '../../format/src/index.ts';
import type { View } from '../../format/src/index.ts';
import { ACTIONS } from './registry.ts';

export const MAX_TEXT = 4000;

export function validateRecord(input: unknown, view: View): string[] {
  if (typeof input !== 'object' || input === null) return ['record: must be an object'];
  const r = input as Partial<TranscriptRecord>;
  const p: string[] = [];
  if (!ACTION_IDS.includes(r.action as never)) return [`action: one of ${ACTION_IDS.join(', ')}`];
  const def = ACTIONS[r.action!];
  if (r.by !== 'person' && r.by !== 'agent') p.push('by: person or agent');
  if (def.personOnly && r.by === 'agent') p.push(`${r.action}: only the person can do this`);
  if (!Number.isInteger(r.version)) p.push('version: integer');

  if (r.action !== 'mode') {
    const node = view.nodes.find((n) => n.id === r.node);
    if (!node) p.push(`node: unknown "${String(r.node)}"`);
    else if (def.onItem && node.n === undefined) p.push(`node: "${node.id}" is not a numbered item`);
  }
  if (def.text === 'required' && (typeof r.text !== 'string' || !r.text.trim()))
    p.push('text: required');
  if (r.text !== undefined && (typeof r.text !== 'string' || r.text.length > MAX_TEXT))
    p.push(`text: string up to ${MAX_TEXT} characters`);
  if (r.action === 'pin' && !(Number.isFinite(r.x) && Number.isFinite(r.y)))
    p.push('pin: x and y must be numbers');
  if (r.action === 'mode') {
    if (!view.regions.some((g) => g.id === r.region)) p.push(`region: unknown "${String(r.region)}"`);
    if (!MODES.includes(r.mode as never)) p.push(`mode: one of ${MODES.join(', ')}`);
  }
  return p;
}

/** Build a record for an action, stamped now. */
export function makeRecord(
  fields: Omit<TranscriptRecord, 'at'>, now: Date = new Date(),
): TranscriptRecord {
  return { at: now.toISOString(), ...fields };
}
