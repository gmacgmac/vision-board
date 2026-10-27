import { FORBIDDEN_KEYS, FORMAT_VERSION, ID_PATTERN, KINDS, MODES } from './view.ts';
import type { View } from './view.ts';
import { NODE_SIZES } from './ledger.ts';
import { appNodeRules, appRefProblems } from './app-shape.ts';
import * as formatViewWords from './words/format-view.ts';
import * as formatCommonWords from './words/format-common.ts';
import { isRecord } from './records.ts';

type Rec = Record<string, unknown>;
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** Every problem in a view file, in reading order. Empty means valid. */
export function validateView(input: unknown): string[] {
  const p: string[] = [];
  if (!isRecord(input)) return [formatViewWords.viewMustBeAnObject];
  if (input.format !== FORMAT_VERSION) p.push(formatViewWords.formatMustBe(FORMAT_VERSION));
  if (!isStr(input.session) || !ID_PATTERN.test(input.session)) p.push(formatViewWords.sessionInvalidId);
  if (!Number.isInteger(input.version) || (input.version as number) < 1) p.push('version: integer >= 1');
  if (!isStr(input.title)) p.push('title: required');
  const regions = Array.isArray(input.regions) ? input.regions : (p.push('regions: array'), []);
  const nodes = Array.isArray(input.nodes) ? input.nodes : (p.push('nodes: array'), []);
  const links = Array.isArray(input.links) ? input.links : (p.push('links: array'), []);

  const regionById = new Map<string, Rec>();
  regions.forEach((r, i) => {
    const at = `regions[${i}]`;
    if (!isRecord(r)) return p.push(formatCommonWords.mustBeAnObject(at));
    if (!isStr(r.id) || !ID_PATTERN.test(r.id)) return p.push(formatViewWords.idInvalidId(at));
    if (regionById.has(r.id)) p.push(formatViewWords.idDuplicate(at, r.id));
    regionById.set(r.id, r);
    if (!isStr(r.title)) p.push(formatViewWords.titleRequired(at));
    if (!MODES.includes(r.mode as never)) p.push(formatViewWords.modeOneOf(at, MODES.join(', ')));
    if (r.mode === 'lanes' && (!Array.isArray(r.lanes) || r.lanes.length === 0))
      p.push(formatCommonWords.lanesRequiredForLanesMode(at));
  });

  const nodeIds = new Set<string>();
  const numbers = new Map<number, string>();
  nodes.forEach((n, i) => {
    const at = `nodes[${i}]`;
    if (!isRecord(n)) return p.push(formatCommonWords.mustBeAnObject(at));
    if (!isStr(n.id) || !ID_PATTERN.test(n.id)) return p.push(formatViewWords.idInvalidId(at));
    if (nodeIds.has(n.id)) p.push(formatViewWords.idDuplicate(at, n.id));
    nodeIds.add(n.id);
    for (const k of FORBIDDEN_KEYS)
      if (k in n) p.push(formatViewWords.noCoordinatesInViewsThe(at, k));
    const region = isStr(n.region) ? regionById.get(n.region) : undefined;
    if (!region) p.push(formatViewWords.regionUnknown(at, String(n.region)));
    if (!KINDS.includes(n.kind as never)) p.push(formatViewWords.kindOneOf(at, KINDS.join(', ')));
    if (!isStr(n.title)) p.push(formatViewWords.titleRequired(at));
    if (n.size !== undefined && !NODE_SIZES.includes(n.size as never)) p.push(formatViewWords.sizeOneOf(at, NODE_SIZES.join(', ')));
    if (n.app !== undefined) appRefProblems(n.app, `${at}.app`, p);
    appNodeRules(n, at, p);
    if (n.n !== undefined) {
      if (!Number.isInteger(n.n) || (n.n as number) < 1) p.push(`${at}.n: integer >= 1`);
      else if (numbers.has(n.n as number))
        p.push(formatViewWords.nAlreadyUsedBy(at, n.n, numbers.get(n.n as number)));
      else numbers.set(n.n as number, n.id);
    }
    if (region?.mode === 'lanes') {
      const lanes = (region.lanes as string[] | undefined) ?? [];
      if (!lanes.includes(n.lane as string)) p.push(formatViewWords.laneOneOf(at, lanes.join(', ')));
    }
  });

  regions.forEach((r, i) => {
    if (isRecord(r) && r.center !== undefined && !nodeIds.has(r.center as string))
      p.push(formatViewWords.regionsCenterUnknownNode(i, String(r.center)));
  });
  links.forEach((l, i) => {
    if (!isRecord(l)) return p.push(formatViewWords.linksMustBeAnObject(i));
    if (!nodeIds.has(l.from as string)) p.push(formatViewWords.linksFromUnknownNode(i, String(l.from)));
    if (!nodeIds.has(l.to as string)) p.push(formatViewWords.linksToUnknownNode(i, String(l.to)));
  });
  return p;
}

/** Narrow after validation; throws with every problem listed. */
export function assertView(input: unknown): View {
  const problems = validateView(input);
  if (problems.length) throw new Error(`Invalid view:\n- ${problems.join('\n- ')}`);
  return input as View;
}
