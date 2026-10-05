import { FORBIDDEN_KEYS, FORMAT_VERSION, ID_PATTERN, KINDS, MODES } from './view.ts';
import type { View } from './view.ts';
import { NODE_SIZES } from './ledger.ts';

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** Every problem in a view file, in reading order. Empty means valid. */
export function validateView(input: unknown): string[] {
  const p: string[] = [];
  if (!isRec(input)) return ['view: must be an object'];
  if (input.format !== FORMAT_VERSION) p.push(`format: must be ${FORMAT_VERSION}`);
  if (!isStr(input.session) || !ID_PATTERN.test(input.session)) p.push('session: invalid id');
  if (!Number.isInteger(input.version) || (input.version as number) < 1) p.push('version: integer >= 1');
  if (!isStr(input.title)) p.push('title: required');
  const regions = Array.isArray(input.regions) ? input.regions : (p.push('regions: array'), []);
  const nodes = Array.isArray(input.nodes) ? input.nodes : (p.push('nodes: array'), []);
  const links = Array.isArray(input.links) ? input.links : (p.push('links: array'), []);

  const regionById = new Map<string, Rec>();
  regions.forEach((r, i) => {
    const at = `regions[${i}]`;
    if (!isRec(r)) return p.push(`${at}: must be an object`);
    if (!isStr(r.id) || !ID_PATTERN.test(r.id)) return p.push(`${at}.id: invalid id`);
    if (regionById.has(r.id)) p.push(`${at}.id: duplicate "${r.id}"`);
    regionById.set(r.id, r);
    if (!isStr(r.title)) p.push(`${at}.title: required`);
    if (!MODES.includes(r.mode as never)) p.push(`${at}.mode: one of ${MODES.join(', ')}`);
    if (r.mode === 'lanes' && (!Array.isArray(r.lanes) || r.lanes.length === 0))
      p.push(`${at}.lanes: required for lanes mode`);
  });

  const nodeIds = new Set<string>();
  const numbers = new Map<number, string>();
  nodes.forEach((n, i) => {
    const at = `nodes[${i}]`;
    if (!isRec(n)) return p.push(`${at}: must be an object`);
    if (!isStr(n.id) || !ID_PATTERN.test(n.id)) return p.push(`${at}.id: invalid id`);
    if (nodeIds.has(n.id)) p.push(`${at}.id: duplicate "${n.id}"`);
    nodeIds.add(n.id);
    for (const k of FORBIDDEN_KEYS)
      if (k in n) p.push(`${at}.${k}: no coordinates in views; the engine places nodes`);
    const region = isStr(n.region) ? regionById.get(n.region) : undefined;
    if (!region) p.push(`${at}.region: unknown "${String(n.region)}"`);
    if (!KINDS.includes(n.kind as never)) p.push(`${at}.kind: one of ${KINDS.join(', ')}`);
    if (!isStr(n.title)) p.push(`${at}.title: required`);
    if (n.size !== undefined && !NODE_SIZES.includes(n.size as never)) p.push(`${at}.size: one of ${NODE_SIZES.join(', ')}`);
    if (n.n !== undefined) {
      if (!Number.isInteger(n.n) || (n.n as number) < 1) p.push(`${at}.n: integer >= 1`);
      else if (numbers.has(n.n as number))
        p.push(`${at}.n: ${n.n} already used by "${numbers.get(n.n as number)}"`);
      else numbers.set(n.n as number, n.id);
    }
    if (region?.mode === 'lanes') {
      const lanes = (region.lanes as string[] | undefined) ?? [];
      if (!lanes.includes(n.lane as string)) p.push(`${at}.lane: one of ${lanes.join(', ')}`);
    }
  });

  regions.forEach((r, i) => {
    if (isRec(r) && r.center !== undefined && !nodeIds.has(r.center as string))
      p.push(`regions[${i}].center: unknown node "${String(r.center)}"`);
  });
  links.forEach((l, i) => {
    if (!isRec(l)) return p.push(`links[${i}]: must be an object`);
    if (!nodeIds.has(l.from as string)) p.push(`links[${i}].from: unknown node "${String(l.from)}"`);
    if (!nodeIds.has(l.to as string)) p.push(`links[${i}].to: unknown node "${String(l.to)}"`);
  });
  return p;
}

/** Narrow after validation; throws with every problem listed. */
export function assertView(input: unknown): View {
  const problems = validateView(input);
  if (problems.length) throw new Error(`Invalid view:\n- ${problems.join('\n- ')}`);
  return input as View;
}
