// Checks a person's `act` event against the action registry and the folded ledger (rule 8,
// api.md 16, 20). The server runs it before appending; the page before sending. One rule set,
// both ends. Problems are plain English the caller can act on. `board` is the board the act was
// sent to (the route's path); when given, everything the act names must be on it.
import type { ActEvent } from '../../format/src/index.ts';
import { CONTAINER_PLACES, isContainerAct, LATER_REGION, latest, NODE_TYPES, revokeProblem } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { sentAfter } from './fold.ts';
import { containerLog } from './containers.ts';
import { grantRequests } from './grants.ts';
import type { Ask } from './notes.ts';
import { cardsOf, isNote, liveNotes } from './notes.ts';
import { standing } from './proposals.ts';
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
  // A container, or with no `region` the whole board (api.md 82).
  revoke: (e, s, board, p) => {
    onBoard(e.board, board, p);
    const problem = revokeProblem(s.index, e.board!, e.region, e.holder!);
    if (problem) p.push(problem);
  },
  move: (e, s, board, p) => moveProblems(e, s, board, p),
};

/** A move (3_FE_03 rulings 1 and 6, api.md 66): every card on one board, the one the act was
 * sent to; the container one of that board's, or its Later, which takes only items that can be
 * saved for later. Any card moves between containers, an item or not. */
function moveProblems(e: ActEvent, s: LedgerState, board: string | undefined, p: string[]): void {
  const field = e.nodes ? 'nodes' : 'n';
  const cards = e.nodes ?? [e.n!];
  const boards = new Set<string>();
  for (const n of cards) {
    const node = s.nodes.get(n);
    if (node) boards.add(node.board);
    else p.push(`${field}: unknown node ${n}`);
  }
  const [on] = boards;
  if (boards.size > 1) return void p.push(`nodes: a move names cards on one board; these are on ${[...boards].map((b) => `"${b}"`).join(' and ')}`);
  if (on === undefined) return;
  if (board !== undefined && on !== board) return void p.push(`${field}: the cards are on board "${on}", not "${board}"`);
  if (e.region !== LATER_REGION) {
    if (!s.boards.get(on)?.regions.some((r) => r.id === e.region))
      p.push(`region: unknown "${String(e.region)}"; pick a container on board "${on}", or ${LATER_REGION}`);
    return;
  }
  for (const n of cards) {
    const v = latest(s.nodes.get(n)!);
    if (!v.item || !NODE_TYPES[v.kind].actions.includes('later'))
      p.push(`region: Later takes only items that can be saved for later; node ${n} is ${v.item ? `a ${v.kind}, which can't` : 'not a numbered item'}`);
  }
}

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
  if (isContainerAct(e)) return containerProblems(e, s, board);
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
  if (node && !p.length) proposalProblems(e, s, p);
  return p;
}

/** An act naming a proposal (api.md 93): one on the same card, not yet decided. Accepting it is
 * the proposal's own action, and only while the card is at the version it was made on; a reject
 * clears one that is out of date too. */
function proposalProblems(e: ActEvent, s: LedgerState, p: string[]): void {
  if (e.proposal === undefined) return;
  const prop = s.proposals.get(e.proposal);
  if (!prop || prop.n !== e.n) return void p.push(`proposal: ${e.proposal} is not a proposal on item ${e.n}`);
  const at = standing(s, prop);
  if (!at) p.push(`proposal: proposal ${e.proposal} was already decided`);
  else if (e.action === 'reject') return;
  else if (e.action !== prop.action) p.push(`proposal: proposal ${e.proposal} is to ${ACTIONS[prop.action].label.toLowerCase()}; accept it with ${prop.action}, or reject it`);
  else if (at === 'stale') p.push(`proposal: ${e.n} changed after this was proposed; ask the agent to look again`);
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
  else if (a.region !== undefined) p.push(`note: note ${e.note} is on container "${a.region}", not node ${e.n}`);
  else if (!cardsOf(a).includes(e.n!)) p.push(a.nodes
    ? `note: note ${e.note} is on items ${a.nodes.join(', ')}, not node ${e.n}`
    : `note: note ${e.note} is on node ${a.n}, not node ${e.n}`);
  else changeProblems(a, e, s, board, p);
}

/** A note may change only while it stands, before a Send, and only by the person who wrote it. */
function changeProblems(a: Ask, e: ActEvent, s: LedgerState, board: string, p: string[]): void {
  if (a.removed !== undefined) p.push(`note: note ${e.note} was removed`);
  else if (sentAfter(s, board, a.seq)) p.push(`note: note ${e.note} was sent to the agent, and a sent note is history; write a new note instead`);
  else if (a.person !== e.person) p.push(`note: note ${e.note} is not yours`);
}

/** A note on, or a place for, a whole container (3_FE_04 rulings 1-2, api.md 72-73): a container
 * on the board the act was sent to, or for a place its built-in Later. */
function containerProblems(e: ActEvent, s: LedgerState, board: string | undefined): string[] {
  const p: string[] = [];
  onBoard(e.board, board, p);
  if (p.length) return p;
  const b = s.boards.get(e.board!);
  if (!b) return [`board: unknown "${String(e.board)}"`];
  const note = !CONTAINER_PLACES.has(e.action);
  if (!b.regions.some((r) => r.id === e.region)) {
    if (e.region === LATER_REGION && note)
      return [`region: Later takes no note: it holds the cards saved for later and is not a thread an agent drew; write the note on one of the board's containers`];
    if (e.region !== LATER_REGION)
      return [`region: unknown "${String(e.region)}"; pick a container on board "${e.board}"${note ? '' : `, or ${LATER_REGION}`}`];
  }
  if (note) containerNoteRules(e, s, p);
  return p;
}

/** The card-note rules on a whole container (api.md 73): one note not yet sent per container from
 * each person, and edits and removals only of that container's own live note before a Send. */
function containerNoteRules(e: ActEvent, s: LedgerState, p: string[]): void {
  const board = e.board!;
  const region = e.region!;
  const log = containerLog(s, board, region);
  if (e.action === 'comment' || e.action === 'context') {
    if (!e.text?.trim()) return void p.push('text: required');
    const open = liveNotes(log ?? { asks: [], decisions: [] }).find((x) => x.person === e.person && !sentAfter(s, board, x.seq));
    if (open) p.push(`region: container "${region}" already has a note not yet sent (note ${open.seq}); change it with note-edit or take it back with note-remove`);
    return;
  }
  const a = s.asks.get(e.note!);
  if (!isNote(a)) p.push(`note: ${e.note} is not a note; name the seq of the comment or context act that made it`);
  else if (a.region === undefined) p.push(`note: note ${e.note} is on ${a.nodes ? `items ${a.nodes.join(', ')}` : `node ${a.n}`}, not container "${region}"`);
  else if (!log?.asks.includes(a)) p.push(`note: note ${e.note} is on container "${a.region}"${a.region === region ? ' of another board' : ''}, not "${region}"`);
  else changeProblems(a, e, s, board, p);
}
