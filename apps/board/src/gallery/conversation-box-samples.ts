// Gallery entry for the conversation box (D-099 3, FE_03): every state of `conversation` mode beside a real card,
// from the fixture's notes, parking and groups boards, through the board's own `boxView` (notes/note-box.ts), placed
// with `placeBeside` as the board places every box beside a node. Empty (the field only), a note waiting for Send,
// asking, sent and waiting for the agent, a reply arrived, failed (the words stay in the field), Ask now as the mode
// (FIX_03), Ask now disabled with its reason, and the tabs of a node in notes on several nodes. The box's template loads on first use, as on the board.
import type { BoardState } from '#actions';
import { boardState } from '#actions';
import type { View } from '#format';
import { boardView } from '#format';
import type { BubblePhase, CardConditions, VbNoteBubbleElement } from '#ui';
import { loadConversation } from '#ui';
import { placeBeside } from '../board/cards/index.ts';
import { createParking } from '../board/cards/index.ts';
import type { BoxDeps } from '../board/notes/index.ts';
import { loadNoteBox } from '../board/notes/index.ts';
import * as notesWords from '../board/words/notes.ts';
import { el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { card } from './node-section.ts';

export interface Board { view: View; state: BoardState; cards: Map<number, CardConditions> }

export interface BoxSample {
  caption: string;
  board: 'notes' | 'parking' | 'groups' | 'imported' | 'other';
  title: string;
  /** The node's board number, where its title is not unique on its board. */
  n?: number;
  /** The tab of the note on these board numbers. */
  group?: string[];
  draft?: string;
  phase?: BubblePhase;
  message?: string;
  by?: 'save' | 'ask';
  blocked?: string;
  /** The box's mode (FIX_03 ruling 3): Add note unless set. */
  active?: 'save' | 'ask';
}

const SAMPLES: BoxSample[] = [
  { caption: 'Empty: no notes yet, only the field', board: 'parking', title: 'Does the trial need a card?' },
  { caption: 'A note not yet sent: dashed, it waits for the board\'s Send; Edit still changes it', board: 'notes', title: 'A note not yet sent' },
  { caption: 'Asking: Ask now is on its way', board: 'notes', title: 'A note not yet sent', phase: 'saving', by: 'ask' },
  { caption: 'Sent: waiting for the agent', board: 'notes', title: 'A sent note' },
  { caption: 'A reply arrived: every note and reply, oldest first', board: 'parking', title: 'Who signs off the price change?' },
  { caption: 'Failed: the box says why and the words stay in the field', board: 'notes', title: 'A note not yet sent', draft: 'Is the floor price per seat?',
    phase: 'error', message: notesWords.notSaved('The board server is not reachable. Is it running?') },
  { caption: 'Ask now as the mode: pink and pressed, the field says Enter asks (a press of either button turns the mode)', board: 'parking', title: 'Does the trial need a card?', active: 'ask' },
  { caption: 'Ask now disabled: its tooltip says why', board: 'parking', title: 'Should quarterly billing stay?', blocked: notesWords.theAgentIsWorking },
  { caption: 'In notes on several nodes: tabs, this node first', board: 'groups', title: 'Which plan is the default?', group: ['1', '3'] },
  { caption: 'Imported (point 617): the conversation as the file held it, each line by its author, then one divider and what was said here; '
    + 'a name too long for its line is cut, whole on hover, and the id stays', board: 'imported', title: 'Who signs off the price change?' },
];

/** An agent name too long for the label line (point 619). */
const LONG_NAME = 'The field operations planning agent for the northern uplink sites';

/** The parking board as an import brought it in (point 617): the card `title`'s notes but its last, and their replies,
 *  imported, the first of those by an agent whose name is too long for the line. */
function importedBoard(b: Board, title: string): Board {
  const n = b.view.nodes.find((x) => x.title === title)!;
  const item = b.state.items.get(n.id)!;
  const last = item.notes.at(-1)!.seq;
  const notes = item.notes.map((x) => (x.seq === last ? x : { ...x, imported: true as const }));
  const old = new Set(notes.filter((x) => x.imported).map((x) => x.seq));
  const c = b.cards.get(n.n!)!;
  const replies = c.replies?.map((r, i) => (r.to === undefined || !old.has(r.to) ? r
    : { ...r, imported: true as const, ...(i === 0 && { agent: LONG_NAME, agentId: 'a-7k2m9q4x' }) }));
  return {
    view: b.view, state: { ...b.state, items: new Map(b.state.items).set(n.id, { ...item, notes }) },
    cards: new Map(b.cards).set(n.n!, { ...c, ...(replies && { replies }) }),
  };
}

/** The groups board, with its replies as the page reads them (parking.ts). */
function groupsBoard(fx: Fixture): Board {
  const parking = createParking({ handover: false, replies: true, state: () => fx.ledger, board: () => 'groups', awaiting: () => new Set(), readOnly: () => false });
  parking.refresh();
  const view = boardView(fx.ledger, 'groups');
  return { view, state: boardState(fx.ledger, 'groups'), cards: new Map(view.nodes.map((n) => [n.n!, parking.card(n)])) };
}

/** One box beside its node on a small stage, placed as the board places it (`placeBeside`); `b` the board it is drawn from. */
export function boxSample(s: BoxSample, b: Board, fx: Fixture, boxView: Awaited<ReturnType<typeof loadNoteBox>>['boxView']): HTMLElement {
  const n = b.view.nodes.find((x) => (s.n !== undefined ? x.n === s.n : x.title === s.title))!;
  const deps = { node: (id: string) => b.view.nodes.find((x) => x.id === id), state: () => b.state, region: () => undefined,
    replies: (id: string) => b.cards.get(Number(b.view.nodes.find((x) => x.id === id)?.n))?.replies ?? [], regionReplies: () => [] };
  const box: BoxDeps = { blocked: () => s.blocked ?? null, listening: () => true, ask: async () => null, looked() {},
    mode: () => s.active ?? 'save', setMode() {} };
  const shown = boxView(deps, box, { id: n.id, anchor: [n.id], mode: 'conversation', kind: 'comment', ...(s.group && { group: s.group }), ...(s.draft && { draft: s.draft }) })!;
  // A board root (as `.g-skin` is), so the box has the board's own base: its one scrollbar (point 618).
  const stage = el('div', 'g-bubble-stage vb-ground vb-board');
  stage.style.setProperty('width', '760px');
  const list = el('div', 'g-bubble-card');
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', `Card ${n.n}`);
  const c = card(n, fx, b.state, b.cards.get(n.n!));
  c.style.transform = 'translate(24px, 24px)';
  list.append(c);
  const bubble = document.createElement('vb-note-bubble') as VbNoteBubbleElement;
  bubble.show(shown.v, shown.on);
  if (s.phase) bubble.setPhase(s.phase, s.message, s.by);
  stage.append(list, bubble);
  requestAnimationFrame(() => {
    bubble.reveal();
    const at = { x: 24, y: 24, w: c.offsetWidth, h: c.offsetHeight };
    const p = placeBeside(at, { w: bubble.offsetWidth, h: bubble.offsetHeight }, { w: 760, h: 2000 });
    bubble.place(p);
    stage.style.setProperty('height', `${Math.ceil(Math.max(at.y + at.h, p.y + bubble.offsetHeight) + 24)}px`);
  });
  const fig = el('figure', 'g-bubble');
  fig.append(stage, el('figcaption', 'g-note', s.caption));
  return fig;
}

/** The group, filled once the box's template has loaded. */
export function conversationBoxSamples(fx: Fixture): HTMLElement {
  const row = el('div', 'g-bubbles');
  const boards = { notes: fx.notes, parking: fx.parking, groups: groupsBoard(fx), imported: importedBoard(fx.parking, 'Who signs off the price change?') };
  void Promise.all([loadNoteBox(), loadConversation()]).then(([m]) => row.append(...SAMPLES.map((s) => boxSample(s, boards[s.board as keyof typeof boards], fx, m.boxView))));
  return group('The conversation box', 'A node\'s notes open one box to read and to write: the node\'s number and title, the thread, '
    + 'a field of one line that grows to three, and Ask now (Cmd or Ctrl Enter) beside Add note (Enter). Add note keeps the note for the board\'s Send; '
    + 'Ask now sends it to the agent at once.', row);
}
