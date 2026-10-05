// Checks a person's `act` event against the action registry and the folded ledger (rule 8,
// api.md 16, 20). The server runs it before appending; the page before sending. One rule set,
// both ends. Problems are plain English the caller can act on. `board` is the board the act was
// sent to (the route's path); when given, everything the act names must be on it.
import type { ActEvent } from '../../format/src/index.ts';
import { containerKey, latest, NODE_TYPES } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { creatorOf, grantRequests } from './grants.ts';
import { ACTIONS, ITEM_ACTIONS } from './registry.ts';

type Rule = (e: ActEvent, s: LedgerState, board: string | undefined, p: string[]) => void;

/** Acts that name a board or a request, not a node. */
const RULES: Partial<Record<ActEvent['action'], Rule>> = {
  mode: (e, s, board, p) => {
    onBoard(e.board, board, p);
    if (!s.boards.get(e.board!)?.regions.some((r) => r.id === e.region))
      p.push(`region: unknown "${String(e.region)}"; pick a region on board "${String(e.board)}"`);
  },
  send: (e, s, board, p) => {
    onBoard(e.board, board, p);
    if (!s.boards.has(e.board!)) p.push(`board: unknown "${String(e.board)}"`);
  },
  grant: (e, s, board, p) => answers(e, s, board, p),
  deny: (e, s, board, p) => answers(e, s, board, p),
  revoke: (e, s, board, p) => {
    onBoard(e.board, board, p);
    const where = `${String(e.board)}/${String(e.region)}`;
    if (creatorOf(s, e.board!, e.region!) === e.holder)
      p.push(`holder: "${e.holder}" created ${where}, and a container's creator cannot be removed`);
    else if (!s.index.holders.get(containerKey(e.board!, e.region!))?.has(e.holder!))
      p.push(`holder: "${e.holder}" does not hold ${where}; nothing to remove`);
  },
};

/** The act was sent to `board` but names `named`. */
function onBoard(named: string | undefined, board: string | undefined, p: string[]): void {
  if (board !== undefined && named !== undefined && named !== board)
    p.push(`board: this act names board "${named}" but was sent to board "${board}"`);
}

/** `grant` and `deny` answer an open grant request on this board. */
function answers(e: ActEvent, s: LedgerState, board: string | undefined, p: string[]): void {
  const r = grantRequests(s).find((x) => x.seq === e.request);
  const here = board ?? e.board;
  if (!r) p.push(`request: ${e.request} is not a grant request; answer one from the board's open requests`);
  else if (r.answer) p.push(`request: grant request ${e.request} was already answered (${r.answer.action})`);
  else if (here !== undefined && r.board !== here)
    p.push(`request: grant request ${e.request} is for board "${r.board}", not "${here}"`);
}

export function validateAct(e: ActEvent, s: LedgerState, board?: string): string[] {
  const def = ACTIONS[e.action];
  if (!def) return [`action: unknown "${String(e.action)}"`];
  if (e.by !== 'person' || def.by !== 'person')
    return [`${e.action}: only the person can do this, on the board; send a propose or reply item instead`];
  const p: string[] = [];
  const rule = RULES[e.action];
  if (rule) {
    rule(e, s, board, p);
    return p;
  }
  const node = e.n === undefined ? undefined : s.nodes.get(e.n);
  if (!node) p.push(`n: unknown node ${String(e.n)}`);
  else if (board !== undefined && node.board !== board) p.push(`n: node ${e.n} is on board "${node.board}", not "${board}"`);
  else if (def.onItem && !latest(node).item) p.push(`n: node ${e.n} is not a numbered item`);
  else if (ITEM_ACTIONS.includes(e.action)) {
    const kind = latest(node).kind;
    if (!NODE_TYPES[kind].actions.includes(e.action)) p.push(`${e.action}: a ${kind} doesn't offer this`);
  }
  if (def.text === 'required' && !e.text?.trim()) p.push('text: required');
  return p;
}
