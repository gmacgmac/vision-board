// Contextual ledger rules: identity and order (D-017, D-018). The index is the smallest state
// needed to judge the next event; the ledger module (step 2) folds the full board state.
import type { LedgerEvent } from './ledger.ts';
import { eventProblems } from './ledger-shape.ts';

export interface LedgerIndex {
  seq: number;
  /** Highest node number ever assigned. New numbers are always above it, so none is reused. */
  maxN: number;
  boards: Map<string, Set<string>>;
  nodes: Map<number, { board: string; ver: number }>;
  proposals: Map<number, { n: number; ver: number }>;
}

export const emptyIndex = (): LedgerIndex =>
  ({ seq: 0, maxN: 0, boards: new Map(), nodes: new Map(), proposals: new Map() });

/** Problems with `e` coming next after `ix`. Assumes `e` is well formed (eventProblems). */
export function contextProblems(ix: LedgerIndex, e: LedgerEvent): string[] {
  const p: string[] = [];
  if (e.seq !== ix.seq + 1) p.push(`seq: expected ${ix.seq + 1}`);
  const node = (n: number | undefined, f = 'n') => {
    const x = n === undefined ? undefined : ix.nodes.get(n);
    if (n !== undefined && !x) p.push(`${f}: unknown node ${n}`);
    return x;
  };
  const verAtMost = (n: number, ver: number | undefined) => {
    const x = node(n);
    if (x && ver !== undefined && ver > x.ver) p.push(`ver: node ${n} is at version ${x.ver}`);
    return x;
  };
  switch (e.type) {
    case 'board':
      if (ix.boards.has(e.board)) p.push(`board: "${e.board}" already exists`);
      break;
    case 'region':
      if (!ix.boards.has(e.board)) p.push(`board: unknown "${e.board}"`);
      break;
    case 'node': {
      const regions = ix.boards.get(e.board);
      if (!regions) p.push(`board: unknown "${e.board}"`);
      else if (!regions.has(e.node.region)) p.push(`node.region: unknown "${e.node.region}"`);
      const prev = ix.nodes.get(e.n);
      if (!prev && e.n <= ix.maxN) p.push(`n: ${e.n} was already used; new nodes get ${ix.maxN + 1} or above`);
      if (prev && prev.board !== e.board) p.push(`n: node ${e.n} belongs to board "${prev.board}"`);
      const want = (prev?.ver ?? 0) + 1;
      if (e.ver !== want) p.push(`ver: expected ${want}`);
      break;
    }
    case 'link': case 'unlink': node(e.from, 'from'); node(e.to, 'to'); break;
    case 'act':
      if (e.action === 'mode') {
        if (!ix.boards.get(e.board!)?.has(e.region!)) p.push(`region: unknown "${e.region}"`);
        break;
      }
      verAtMost(e.n!, e.ver);
      if (e.proposal !== undefined) {
        const prop = ix.proposals.get(e.proposal);
        const cur = ix.nodes.get(e.n!)?.ver;
        if (!prop || prop.n !== e.n) p.push(`proposal: no proposal ${e.proposal} for node ${e.n}`);
        else if (prop.ver !== cur) p.push(`proposal: out of date, node ${e.n} changed since it was made`);
      }
      break;
    case 'seen': case 'propose': verAtMost(e.n, e.ver); break;
    case 'reply': case 'park': node(e.n); break;
  }
  return p;
}

/** Record `e` in the index. Call only after it passed both checks. */
export function indexEvent(ix: LedgerIndex, e: LedgerEvent): void {
  ix.seq = e.seq;
  if (e.type === 'board') ix.boards.set(e.board, new Set());
  else if (e.type === 'region') ix.boards.get(e.board)?.add(e.region.id);
  else if (e.type === 'node') {
    ix.nodes.set(e.n, { board: e.board, ver: e.ver });
    ix.maxN = Math.max(ix.maxN, e.n);
  } else if (e.type === 'propose') ix.proposals.set(e.seq, { n: e.n, ver: e.ver });
}

/** Every problem in a whole ledger, as "line N: ...". Empty means valid. Lines with problems are
 * skipped, so one bad event is reported without hiding the rest (D-019). */
export function validateLedger(lines: string[]): string[] {
  const out: string[] = [];
  const ix = emptyIndex();
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    let e: unknown;
    try { e = JSON.parse(line); } catch { ix.seq += 1; return void out.push(`line ${i + 1}: not JSON`); }
    let p = eventProblems(e);
    if (!p.length) p = contextProblems(ix, e as LedgerEvent);
    if (p.length) {
      out.push(...p.map((x) => `line ${i + 1}: ${x}`));
      const seq = (e as { seq?: unknown }).seq;
      if (Number.isInteger(seq)) ix.seq = seq as number; // one bad line, not a cascade
    } else indexEvent(ix, e as LedgerEvent);
  });
  return out;
}
