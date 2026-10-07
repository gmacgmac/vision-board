// Contextual ledger rules: identity and order (D-017, D-018). The index is the smallest state
// needed to judge the next event; the ledger module (step 2) folds the full board state.
import type { ActEvent, LedgerEvent } from './ledger.ts';
import { actCard, CONTAINER_PLACES, isContainerAct, LATER_REGION } from './ledger.ts';
import { eventProblems } from './ledger-shape.ts';

export interface LedgerIndex {
  seq: number;
  /** Highest node number ever assigned. New numbers are always above it, so none is reused. */
  maxN: number;
  boards: Map<string, Set<string>>;
  nodes: Map<number, { board: string; ver: number }>;
  proposals: Map<number, { n: number; ver: number }>;
  /** Agent ids that have joined (D-027). */
  agents: Set<string>;
  /** Board or container (`accessKey`) -> the agent whose v3 line created it. v2 lines made none. */
  creators: Map<string, string>;
  /** Board or container (`accessKey`) -> the agents that hold it now (api.md 81-82). A container:
   * its creator and every grant, minus revocations. A board: its creator, every agent granted the
   * board, and every agent that created or was granted a container on it, minus board revocations;
   * so an agent that wrote on a board before board access keeps it (D-034). */
  holders: Map<string, Set<string>>;
  /** `grant-request` seq -> the request, and the seq of the act that answered it. */
  requests: Map<number, GrantRequest>;
}

/** A grant request: for `region` on `board`, or with no `region` for the whole board. */
export interface GrantRequest {
  agent?: string; board: string; region?: string;
  answer?: { action: 'grant' | 'deny'; seq: number };
}

export const emptyIndex = (): LedgerIndex => ({
  seq: 0, maxN: 0, boards: new Map(), nodes: new Map(), proposals: new Map(),
  agents: new Set(), creators: new Map(), holders: new Map(), requests: new Map(),
});

/** One key per container (a region, D-011). Ids cannot contain `/`, so the key is unambiguous. */
export const containerKey = (board: string, region: string): string => `${board}/${region}`;

/** The key `creators` and `holders` use: the board's id for the whole board (no `region`), else
 * the container's `containerKey`. Board ids hold no `/`, so the two never meet. */
export const accessKey = (board: string, region?: string): string =>
  region === undefined ? board : containerKey(board, region);

/** How a problem names a board or a container. */
const accessName = (board: string, region?: string): string => region === undefined ? `board ${board}` : `${board}/${region}`;

/** Why `holder` cannot be revoked from the board, or the container in `region`, or undefined when
 * it can: a creator stays, and only a holder can be removed (api.md 16, 82). The ledger and the
 * person's act check both ask here. */
export function revokeProblem(ix: LedgerIndex, board: string, region: string | undefined, holder: string): string | undefined {
  const k = accessKey(board, region);
  const what = accessName(board, region);
  if (ix.creators.get(k) === holder)
    return `holder: "${holder}" created ${what}, and a ${region === undefined ? 'board' : 'container'}'s creator cannot be removed`;
  if (!ix.holders.get(k)?.has(holder)) return `holder: "${holder}" does not hold ${what}`;
  return undefined;
}

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
      // The built-in Later is every board's own (api.md 67); older lines keep their meaning.
      if (e.v >= 6 && e.region.id === LATER_REGION && !ix.boards.get(e.board)?.has(LATER_REGION))
        p.push(`region.id: "${LATER_REGION}" is the board's built-in Later container; pick another id`);
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
      actContext(ix, e, p);
      for (const n of e.nodes ?? []) node(n, 'nodes');
      if (e.n === undefined) break;
      verAtMost(e.n, e.ver);
      if (e.proposal !== undefined) {
        const prop = ix.proposals.get(e.proposal);
        const cur = ix.nodes.get(e.n!)?.ver;
        if (!prop || prop.n !== e.n) p.push(`proposal: no proposal ${e.proposal} for node ${e.n}`);
        else if (prop.ver !== cur) p.push(`proposal: out of date, node ${e.n} changed since it was made`);
      }
      break;
    case 'seen':
      if ('n' in e) verAtMost(e.n, e.ver);
      else if (!ix.boards.has(e.board)) p.push(`board: unknown "${e.board}"`);
      else if (e.head > ix.seq) p.push(`head: the ledger is at line ${ix.seq}`);
      break;
    case 'propose': verAtMost(e.n, e.ver); break;
    case 'reply': case 'park': node(e.n); break;
    case 'join':
      if (e.agent !== undefined && ix.agents.has(e.agent)) p.push(`agent: "${e.agent}" has already joined`);
      break;
    case 'grant-request': {
      if (!ix.boards.has(e.board)) p.push(`board: unknown "${e.board}"`);
      else if (e.region !== undefined && !ix.boards.get(e.board)!.has(e.region)) p.push(`region: unknown "${e.region}"`);
      const open = openRequestOf(ix, e.agent, e.board, e.region);
      if (open !== undefined) p.push(`board: this agent already has open grant request ${open} for ${accessName(e.board, e.region)}`);
      break;
    }
  }
  return p;
}

/** The `seq` of `agent`'s unanswered grant request for the container, or with no `region` for
 * the board, if any (api.md 26). */
export function openRequestOf(ix: LedgerIndex, agent: string | undefined, board: string, region?: string): number | undefined {
  for (const [seq, r] of ix.requests) {
    if (!r.answer && r.agent === agent && r.board === board && r.region === region) return seq;
  }
  return undefined;
}

/** The container rules of an `act`: mode, move, grant, deny, revoke and send (api.md 16, 23, 66),
 * and a note on or a place for a whole container (api.md 72). */
function actContext(ix: LedgerIndex, e: ActEvent, p: string[]): void {
  const region = () => { if (!ix.boards.get(e.board!)?.has(e.region!)) p.push(`region: unknown "${e.region}"`); };
  if (isContainerAct(e)) {
    const regions = ix.boards.get(e.board!);
    if (!regions) p.push(`board: unknown "${e.board}"`);
    // Later can be placed but takes no note: it is not a thread an agent drew (3_FE_04 ruling 2).
    else if (!regions.has(e.region!) && !(e.region === LATER_REGION && CONTAINER_PLACES.has(e.action)))
      p.push(e.region === LATER_REGION
        ? `region: unknown "${LATER_REGION}" as a container to write on: Later takes no note, since no agent drew it; write the note on one of the board's containers`
        : `region: unknown "${e.region}" on board "${e.board}"`);
    return;
  }
  switch (e.action) {
    case 'mode': region(); break;
    case 'move': {
      const board = ix.nodes.get(actCard(e)!)?.board;
      if (board !== undefined && e.region !== LATER_REGION && !ix.boards.get(board)?.has(e.region!))
        p.push(`region: unknown "${e.region}" on board "${board}"`);
      break;
    }
    case 'send': if (!ix.boards.has(e.board!)) p.push(`board: unknown "${e.board}"`); break;
    case 'grant': case 'deny': {
      const r = ix.requests.get(e.request!);
      if (!r) p.push(`request: no grant request ${e.request}`);
      else if (r.answer) p.push(`request: grant request ${e.request} was already answered`);
      break;
    }
    case 'revoke': {
      const problem = revokeProblem(ix, e.board!, e.region, e.holder!);
      if (problem) p.push(problem);
      break;
    }
  }
}

/** Record `e` in the index. Call only after it passed both checks. */
export function indexEvent(ix: LedgerIndex, e: LedgerEvent): void {
  ix.seq = e.seq;
  switch (e.type) {
    case 'board':
      ix.boards.set(e.board, new Set());
      if (e.v !== 2 && e.agent !== undefined) create(ix, e.board, e.agent);
      break;
    case 'region': indexRegion(ix, e.board, e.region.id, e.v !== 2 ? e.agent : undefined); break;
    case 'node':
      ix.nodes.set(e.n, { board: e.board, ver: e.ver });
      ix.maxN = Math.max(ix.maxN, e.n);
      break;
    case 'propose': ix.proposals.set(e.seq, { n: e.n, ver: e.ver }); break;
    case 'join': if (e.agent !== undefined) ix.agents.add(e.agent); break;
    case 'grant-request':
      ix.requests.set(e.seq, {
        board: e.board, ...(e.region !== undefined && { region: e.region }), ...(e.agent !== undefined && { agent: e.agent }),
      });
      break;
    case 'act': indexAct(ix, e); break;
  }
}

/** `agent` holds the board or container at `key`. */
const hold = (ix: LedgerIndex, key: string, agent: string) => ix.holders.set(key, (ix.holders.get(key) ?? new Set()).add(agent));

/** `agent`'s v3 line created the board or container at `key`: it is its creator and a holder. */
function create(ix: LedgerIndex, key: string, agent: string): void {
  ix.creators.set(key, agent);
  hold(ix, key, agent);
}

/** A region id seen for the first time is a new container; a v3 writer creates it, and so holds
 * its board too (D-034). */
function indexRegion(ix: LedgerIndex, board: string, region: string, agent: string | undefined): void {
  const regions = ix.boards.get(board);
  if (!regions || regions.has(region)) return;
  regions.add(region);
  if (agent === undefined) return;
  create(ix, containerKey(board, region), agent);
  hold(ix, board, agent);
}

function indexAct(ix: LedgerIndex, e: ActEvent): void {
  if (e.action === 'grant' || e.action === 'deny') {
    const r = ix.requests.get(e.request!);
    if (!r) return;
    r.answer = { action: e.action, seq: e.seq };
    // A grant on a container is a grant on its board too (D-034).
    if (e.action === 'grant' && r.agent !== undefined) {
      hold(ix, r.board, r.agent);
      if (r.region !== undefined) hold(ix, containerKey(r.board, r.region), r.agent);
    }
  } else if (e.action === 'revoke') ix.holders.get(accessKey(e.board!, e.region))?.delete(e.holder!);
}

export interface ReadLedger { events: LedgerEvent[]; problems: string[]; index: LedgerIndex }

/** Parse and check a whole ledger. `events` holds the valid events in order; `problems` every
 * problem as "line N: ...". Lines with problems are skipped, so one bad event is reported without
 * hiding the rest (D-019). */
export function readLedger(lines: string[]): ReadLedger {
  const events: LedgerEvent[] = [];
  const problems: string[] = [];
  const index = emptyIndex();
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    let e: unknown;
    try { e = JSON.parse(line); } catch { index.seq += 1; return void problems.push(`line ${i + 1}: not JSON`); }
    let p = eventProblems(e);
    if (!p.length) p = contextProblems(index, e as LedgerEvent);
    if (p.length) {
      problems.push(...p.map((x) => `line ${i + 1}: ${x}`));
      const seq = (e as { seq?: unknown }).seq;
      if (Number.isInteger(seq)) index.seq = Math.max(index.seq, seq as number); // one bad line, not a cascade
    } else {
      indexEvent(index, e as LedgerEvent);
      events.push(e as LedgerEvent);
    }
  });
  return { events, problems, index };
}

/** Every problem in a whole ledger. Empty means valid. */
export const validateLedger = (lines: string[]): string[] => readLedger(lines).problems;
