// Checks a person's `act` event against the action registry and the folded ledger (rule 8,
// api.md 16, 20). The server runs it before appending; the page before sending. One rule set,
// both ends. Problems are plain English the caller can act on. `board` is the board the act was
// sent to (the route's path); when given, everything the act names must be on it.
import type { ActEvent } from '../../format/src/index.ts';
import { containerKey, latest, NODE_TYPES } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { sentAfter } from './fold.ts';
import { creatorOf, grantRequests } from './grants.ts';
import { cardsOf, isNote, liveNotes } from './notes.ts';
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
  if (e.nodes) return groupProblems(e, s, board);
  const node = e.n === undefined ? undefined : s.nodes.get(e.n);
  if (!node) p.push(`n: unknown node ${String(e.n)}`);
  else if (board !== undefined && node.board !== board) p.push(`n: node ${e.n} is on board "${node.board}", not "${board}"`);
  else if (def.onItem && !latest(node).item) p.push(`n: node ${e.n} is not a numbered item`);
  else if (ITEM_ACTIONS.includes(e.action)) {
    const kind = latest(node).kind;
    if (!NODE_TYPES[kind].actions.includes(e.action)) p.push(`${e.action}: a ${kind} doesn't offer this`);
  }
  if (def.text === 'required' && !e.text?.trim()) p.push('text: required');
  if (node && !p.length) noteRules(e, s, node.board, p);
  return p;
}

/** A note on a group of cards (3_FE_02 ruling 4, api.md 62): every named node is an item that
 * offers the action, all on one board, the board the act was sent to. The one-note-per-card rule
 * is for notes on one card: a card may also be in a group note not yet sent (ruling 3). */
function groupProblems(e: ActEvent, s: LedgerState, board: string | undefined): string[] {
  const p: string[] = [];
  const boards = new Set<string>();
  for (const n of e.nodes!) {
    const node = s.nodes.get(n);
    if (!node) { p.push(`nodes: unknown node ${n}`); continue; }
    boards.add(node.board);
    const v = latest(node);
    if (!v.item) p.push(`nodes: node ${n} is not a numbered item`);
    else if (!NODE_TYPES[v.kind].actions.includes(e.action)) p.push(`nodes: node ${n} is a ${v.kind}, which doesn't offer ${e.action}`);
  }
  const [only] = boards;
  if (boards.size > 1) p.push(`nodes: a note on a group names items on one board; these are on ${[...boards].map((b) => `"${b}"`).join(' and ')}`);
  else if (only !== undefined && board !== undefined && only !== board) p.push(`nodes: the items are on board "${only}", not "${board}"`);
  if (!e.text?.trim()) p.push('text: required');
  return p;
}

/** One note not yet sent per card (ruling 1), and edits and removals only of the person's own
 * live note before a Send (rulings 2-4, api.md 58-61). A note on a group is changed from any of
 * the cards it is on (3_FE_02 ruling 3). */
function noteRules(e: ActEvent, s: LedgerState, board: string, p: string[]): void {
  if ((e.action === 'comment' || e.action === 'context') && e.text?.trim()) {
    const open = liveNotes(s.logs.get(e.n!) ?? { asks: [], decisions: [] })
      .find((x) => x.nodes === undefined && x.person === e.person && !sentAfter(s, board, x.seq));
    if (open) p.push(`n: item ${e.n} already has a note not yet sent (note ${open.seq}); change it with note-edit or take it back with note-remove`);
    return;
  }
  if (e.action !== 'note-edit' && e.action !== 'note-remove') return;
  const a = s.asks.get(e.note!);
  if (!isNote(a)) p.push(`note: ${e.note} is not a note; name the seq of the comment or context act that made it`);
  else if (!cardsOf(a).includes(e.n!)) p.push(a.nodes
    ? `note: note ${e.note} is on items ${a.nodes.join(', ')}, not node ${e.n}`
    : `note: note ${e.note} is on node ${a.n}, not node ${e.n}`);
  else if (a.removed !== undefined) p.push(`note: note ${e.note} was removed`);
  else if (sentAfter(s, board, a.seq)) p.push(`note: note ${e.note} was sent to the agent, and a sent note is history; write a new note instead`);
  else if (a.person !== e.person) p.push(`note: note ${e.note} is not yours`);
}
