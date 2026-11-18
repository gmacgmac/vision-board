// Gallery entry for the conversation box (nodeEdges flag, FE_03): every state of `conversation` mode beside a real card,
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

interface Board { view: View; state: BoardState; cards: Map<number, CardConditions> }

interface BoxSample {
  caption: string;
  board: 'notes' | 'parking' | 'groups';
  title: string;
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
];

/** The groups board, with its replies as the page reads them (parking.ts). */
function groupsBoard(fx: Fixture): Board {
  const parking = createParking({ handover: false, replies: true, state: () => fx.ledger, board: () => 'groups', awaiting: () => new Set(), readOnly: () => false });
  parking.refresh();
  const view = boardView(fx.ledger, 'groups');
  return { view, state: boardState(fx.ledger, 'groups'), cards: new Map(view.nodes.map((n) => [n.n!, parking.card(n)])) };
}

function sample(s: BoxSample, b: Board, fx: Fixture, boxView: Awaited<ReturnType<typeof loadNoteBox>>['boxView']): HTMLElement {
  const n = b.view.nodes.find((x) => x.title === s.title)!;
  const deps = { node: (id: string) => b.view.nodes.find((x) => x.id === id), state: () => b.state, region: () => undefined,
    replies: (id: string) => b.cards.get(Number(b.view.nodes.find((x) => x.id === id)?.n))?.replies ?? [], regionReplies: () => [] };
  const box: BoxDeps = { blocked: () => s.blocked ?? null, listening: () => true, ask: async () => null, looked() {}, asked: () => new Set(),
    mode: () => s.active ?? 'save', setMode() {} };
  const shown = boxView(deps, box, { id: n.id, anchor: [n.id], mode: 'conversation', kind: 'comment', ...(s.group && { group: s.group }), ...(s.draft && { draft: s.draft }) })!;
  const stage = el('div', 'g-bubble-stage vb-ground');
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
  const boards = { notes: fx.notes, parking: fx.parking, groups: groupsBoard(fx) };
  void Promise.all([loadNoteBox(), loadConversation()]).then(([m]) => row.append(...SAMPLES.map((s) => sample(s, boards[s.board], fx, m.boxView))));
  return group('The conversation box', 'With the nodeEdges flag a node\'s notes open one box to read and to write: the node\'s number and title, the thread, '
    + 'a field of one line that grows to three, and Ask now (Cmd or Ctrl Enter) beside Add note (Enter). Add note keeps the note for the board\'s Send; '
    + 'Ask now sends it to the agent at once.', row);
}
