// Contextual ledger rules: identity and order (D-017, D-018, D-041 proposed). The index is the
// smallest state needed to judge the next event, and it numbers each board's cards (api.md 125);
// the ledger module (packages/actions) folds the full board state. Events here are as code reads
// them (`fromLine`): a card is its `id`.
import type { ActEvent, LedgerEvent } from './ledger.ts';
import { actCard, CONTAINER_PLACES, isContainerAct, LATER_REGION } from './ledger.ts';
import { eventProblems } from './ledger-shape.ts';
import { fromLine } from './ledger-line.ts';
import { retireContext } from './retire-rules.ts';
import { accessKey, accessName, containerKey, openRequestOf, revokeProblem } from './access-rules.ts';

export { accessKey, containerKey, openRequestOf, revokeProblem } from './access-rules.ts';

export interface LedgerIndex {
  seq: number;
  /** Highest card identity ever assigned. New ones are always above it, so none is reused. */
  maxId: number;
  /** Board -> its containers (region ids) on the board now; a retired container leaves. */
  boards: Map<string, Set<string>>;
  /** Card identity -> its board, latest version and board number (api.md 125). */
  nodes: Map<number, { board: string; ver: number; n: number }>;
  /** Board -> its cards' identities in the order first drawn: board number `n` is at `n - 1`.
   * Retired cards stay in it, so no number is ever given twice (api.md 126). */
  cards: Map<string, number[]>;
  /** Card identity -> `seq` of the `retire` line that took it off its board. */
  retired: Map<number, number>;
  /** `containerKey` of every retired container: its id is never used again on that board. */
  retiredRegions: Set<string>;
  proposals: Map<number, { id: number; ver: number }>;
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
  seq: 0, maxId: 0, boards: new Map(), nodes: new Map(), cards: new Map(), retired: new Map(), retiredRegions: new Set(), proposals: new Map(),
  agents: new Set(), creators: new Map(), holders: new Map(), requests: new Map(),
});

/** The board number of card `id` (api.md 125), or undefined for an unknown card. */
export const boardNumber = (ix: LedgerIndex, id: number): number | undefined => ix.nodes.get(id)?.n;

/** The identity of card `n` on `board`, retired or not, or undefined when the board has no card `n`. */
export const cardId = (ix: LedgerIndex, board: string, n: number): number | undefined =>
  Number.isInteger(n) && n >= 1 ? ix.cards.get(board)?.[n - 1] : undefined;

/** How a problem names a card: by default its identity, which the ledger file holds. The server
 * passes one that gives the board number, for words an agent or the person reads (api.md 125). */
export type CardName = (id: number) => string;

/** Problems with `e` coming next after `ix`. Assumes `e` is well formed (eventProblems). Words
 * name a card with `name` (its identity, unless the caller gives board numbers); a field keeps the
 * name the file gives it (`n`). */
export function contextProblems(ix: LedgerIndex, e: LedgerEvent, name: CardName = String): string[] {
  const p: string[] = [];
  if (e.seq !== ix.seq + 1) p.push(`seq: expected ${ix.seq + 1}`);
  // A card named by an event must exist and, but for an unlink, still be on its board.
  const node = (id: number | undefined, f = 'n') => {
    const x = id === undefined ? undefined : ix.nodes.get(id);
    if (id !== undefined && !x) p.push(`${f}: unknown node ${id}`);
    else if (id !== undefined && ix.retired.has(id) && e.type !== 'unlink') p.push(`${f}: card ${name(id)} is retired`);
    return x;
  };
  const verAtMost = (id: number, ver: number | undefined) => {
    const x = node(id);
    if (x && ver !== undefined && ver > x.ver) p.push(`ver: node ${name(id)} is at version ${x.ver}`);
    return x;
  };
  switch (e.type) {
    // The person may rename any board (D-034, api.md 90); an agent's second line is refused.
    case 'board':
      if (ix.boards.has(e.board) && e.by !== 'person') p.push(`board: "${e.board}" already exists`);
      break;
    case 'region':
      if (!ix.boards.has(e.board)) p.push(`board: unknown "${e.board}"`);
      else if (ix.retiredRegions.has(containerKey(e.board, e.region.id))) p.push(`region.id: container "${e.region.id}" was retired; pick another id`);
      // The built-in Later is every board's own (api.md 67); older lines keep their meaning.
      if (e.v >= 6 && e.region.id === LATER_REGION && !ix.boards.get(e.board)?.has(LATER_REGION))
        p.push(`region.id: "${LATER_REGION}" is the board's built-in Later container; pick another id`);
      break;
    case 'node': {
      const regions = ix.boards.get(e.board);
      if (!regions) p.push(`board: unknown "${e.board}"`);
      else if (ix.retiredRegions.has(containerKey(e.board, e.node.region))) p.push(`node.region: container "${e.node.region}" was retired`);
      else if (!regions.has(e.node.region)) p.push(`node.region: unknown "${e.node.region}"`);
      const prev = ix.nodes.get(e.id);
      if (!prev && e.id <= ix.maxId) p.push(`n: ${e.id} was already used; new nodes get ${ix.maxId + 1} or above`);
      if (prev && prev.board !== e.board) p.push(`n: node ${name(e.id)} belongs to board "${prev.board}"`);
      if (prev && ix.retired.has(e.id)) p.push(`n: card ${name(e.id)} is retired; draw a new card instead`);
      const want = (prev?.ver ?? 0) + 1;
      if (e.ver !== want) p.push(`ver: expected ${want}`);
      break;
    }
    case 'link': case 'unlink': node(e.from, 'from'); node(e.to, 'to'); break;
    case 'act':
      actContext(ix, e, p);
      for (const id of e.nodes ?? []) node(id, 'nodes');
      if (e.id === undefined) break;
      verAtMost(e.id, e.ver);
      if (e.proposal !== undefined) {
        const prop = ix.proposals.get(e.proposal);
        const cur = ix.nodes.get(e.id)?.ver;
        if (!prop || prop.id !== e.id) p.push(`proposal: no proposal ${e.proposal} for node ${name(e.id)}`);
        // An out-of-date proposal can't be accepted, but it can be turned down (api.md 93).
        else if (prop.ver !== cur && e.action !== 'reject') p.push(`proposal: out of date, node ${name(e.id)} changed since it was made`);
      }
      break;
    case 'retire': retireContext(ix, e, p, name); break;
    case 'seen':
      if ('id' in e) verAtMost(e.id, e.ver);
      else if (!ix.boards.has(e.board)) p.push(`board: unknown "${e.board}"`);
      else if (e.head > ix.seq) p.push(`head: the ledger is at line ${ix.seq}`);
      break;
    case 'propose': verAtMost(e.id, e.ver); break;
    case 'reply': case 'park': node(e.id); break;
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

/** The container rules of an `act`: mode, widths, move, grant, deny, revoke, send and the board marks (api.md 16, 23, 66, 132, 135, 138),
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
    case 'mode': case 'widths': region(); break;
    case 'move': {
      const board = ix.nodes.get(actCard(e)!)?.board;
      if (board === undefined || e.region === LATER_REGION || ix.boards.get(board)?.has(e.region!)) break;
      p.push(ix.retiredRegions.has(containerKey(board, e.region!))
        ? `region: container "${e.region}" was retired` : `region: unknown "${e.region}" on board "${board}"`);
      break;
    }
    // Send, and the person's marks on a whole board (api.md 135, 138), name a board that exists.
    case 'send': case 'archive': case 'restore': case 'lock': case 'unlock': if (!ix.boards.has(e.board!)) p.push(`board: unknown "${e.board}"`); break;
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
      if (!ix.boards.has(e.board)) ix.boards.set(e.board, new Set());
      if (e.v !== 2 && e.agent !== undefined) create(ix, e.board, e.agent);
      break;
    case 'region': indexRegion(ix, e.board, e.region.id, e.v !== 2 ? e.agent : undefined); break;
    case 'node': {
      const known = ix.nodes.get(e.id);
      if (known) { known.ver = e.ver; break; }
      const cards = ix.cards.get(e.board) ?? [];
      ix.cards.set(e.board, cards);
      cards.push(e.id);
      ix.nodes.set(e.id, { board: e.board, ver: e.ver, n: cards.length });
      ix.maxId = Math.max(ix.maxId, e.id);
      break;
    }
    case 'retire':
      for (const id of e.cards) ix.retired.set(id, e.seq);
      if (e.region !== undefined) {
        ix.retiredRegions.add(containerKey(e.board, e.region));
        ix.boards.get(e.board)?.delete(e.region);
      }
      break;
    case 'propose': ix.proposals.set(e.seq, { id: e.id, ver: e.ver }); break;
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

/** Parse and check a whole ledger: each line's shape as the file holds it, then the event code
 * reads (`fromLine`) in context. `events` holds the valid events in order; `problems` every
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
    const event = p.length ? undefined : fromLine(e as Record<string, unknown>);
    if (event) p = contextProblems(index, event);
    if (p.length || !event) {
      problems.push(...p.map((x) => `line ${i + 1}: ${x}`));
      const seq = (e as { seq?: unknown }).seq;
      if (Number.isInteger(seq)) index.seq = Math.max(index.seq, seq as number); // one bad line, not a cascade
    } else {
      indexEvent(index, event);
      events.push(event);
    }
  });
  return { events, problems, index };
}

/** Every problem in a whole ledger. Empty means valid. */
export const validateLedger = (lines: string[]): string[] => readLedger(lines).problems;
