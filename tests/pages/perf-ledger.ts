// The performance fixture (N12_FE_01, docs/specification/performance.md): writes a project ledger
// with two boards built from the roadmap fixture's shapes (rule 11: the fixtures stay the source
// shape, nothing is hand-written here).
// - `big`: 1,000 cards. Its 20 containers repeat the roadmap's four (grid, flow, radial, lanes) five
//   times, 50 cards each, the cards taking the roadmap's kinds, titles, bodies and lanes in turn,
//   with the roadmap's kinds of links (a chain in flow and lanes, spokes from the centre in radial).
// - `mixed`: a copy of the roadmap board, for the same-picture test, which changes it at random.
// Deterministic: same file every run. Run: node tests/pages/perf-ledger.ts <out-file>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIXTURES_DIR } from '#format/files';

type Line = Record<string, unknown> & { type: string };

const ROADMAP = `${FIXTURES_DIR}roadmap.ledger.jsonl`;
export const BIG = { board: 'big', regions: 20, perRegion: 50 } as const;

export function perfLedger(): string[] {
  const src = fs.readFileSync(ROADMAP, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Line);
  const regions = src.filter((e) => e.type === 'region').map((e) => e.region as Record<string, unknown>);
  const nodes = src.filter((e) => e.type === 'node').map((e) => ({ n: e.n as number, node: e.node as Record<string, unknown> }));
  const out: Line[] = [];
  const add = (e: Line) => out.push({
    v: 2, seq: out.length + 1, at: new Date(Date.UTC(2026, 9, 2, 9, 0, 0, out.length * 10)).toISOString().replace('.000', ''),
    by: 'agent', agent: 'kiro', ...e,
  });
  add({ type: 'board', board: BIG.board, title: 'A thousand cards', summary: 'The roadmap\'s shapes, 1,000 cards, for the performance budgets.' });
  let n = 0;
  for (let r = 0; r < BIG.regions; r++) {
    const base = regions[r % regions.length]!;
    const id = `r${String(r + 1).padStart(2, '0')}`;
    const first = n + 1;
    const ofRegion = nodes.filter((x) => x.node.region === base.id);
    const region = { ...base, id, title: `${String(base.title)} ${r + 1}`, ...(base.center !== undefined && { center: first }) };
    add({ type: 'region', board: BIG.board, region });
    for (let i = 0; i < BIG.perRegion; i++) {
      const like = ofRegion[i % ofRegion.length]!.node;
      add({ type: 'node', board: BIG.board, n: ++n, ver: 1, node: { ...like, region: id, title: `${String(like.title)} (${n})` } });
    }
    for (let i = 1; i < BIG.perRegion; i++) {
      const from = base.mode === 'radial' ? first : first + i - 1;
      if (base.mode !== 'grid') add({ type: 'link', from, to: first + i });
    }
  }
  // `mixed`: the roadmap board again, under its own id and numbers.
  const offset = n;
  for (const e of src) {
    const { v: _v, seq: _seq, at: _at, by: _by, agent: _agent, ...rest } = e;
    if (e.type === 'board') add({ ...rest, type: 'board', board: 'mixed', title: 'Mixed modes' });
    else if (e.type === 'region') {
      const region = e.region as Record<string, unknown>;
      add({ ...rest, type: 'region', board: 'mixed', region: { ...region, ...(region.center !== undefined && { center: (region.center as number) + offset }) } });
    } else if (e.type === 'node') add({ ...rest, type: 'node', board: 'mixed', n: (e.n as number) + offset });
    else if (e.type === 'link') add({ ...rest, type: 'link', from: (e.from as number) + offset, to: (e.to as number) + offset });
  }
  return out.map((e) => JSON.stringify(e));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) throw new Error('usage: node tests/pages/perf-ledger.ts <out-file>');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${perfLedger().join('\n')}\n`);
}
