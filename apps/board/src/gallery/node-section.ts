// Gallery entry for <vb-node>: the cards that ask and the cards that tell, each kind in every status
// it can reach (every-node FE_01) and once cleared by the agent's answer to a note (D-045), then the
// other states (pinned, emphasis, tags, notes, topic and note, long text, lifted). Each card is a real
// <vb-node>: rendered from a ledger node and updated with `nodeState`, exactly as the board does.
import type { Kind, ViewNode } from '#format';
import { KINDS, NODE_TYPES } from '#format';
import type { ItemStatus } from '#actions';
import { statusOf } from '#actions';
import type { CardConditions, VbNodeElement } from '#ui';
import { nodeState } from '#ui';
import { pageMarkdown } from '../flags.ts';
import { cardList, el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { REGION_KINDS, REGION_OTHER } from './fixture.ts';

/** The notes board's cards the "Notes put away, and note times" group draws (card-polish FE_02). */
const HIDDEN_AND_TIMES = new Set(['Notes put away', 'A reply since you put them away', 'Note times']);
/** Classes the board puts on a node while something is happening to it. Keyed by node title. */
const LIVE_CLASS: Record<string, string> = { 'Being dragged': 'dragging' };
/** View state the board passes to `nodeState`: the person's selection (3_FE_01). Keyed by title. */
const SELECTED = new Set(['Selected']);

/** A matrix row: a status the person gave, or `cleared`, the agent's answer to the card's note
 *  (D-045, answer-model ruling 7): open again and unmarked, with its update tab until looked at. */
type Row = ItemStatus | 'cleared';
/** The row's label: the footer's word, or for ✓ and ✗, which show none, the mark and its name. */
const ROW_LABEL: Partial<Record<Row, string>> = {
  open: 'Open', acknowledged: '✓ Checked', dropped: '✗ Crossed', commented: 'Replied', cleared: 'Answered by the agent', later: 'Saved for later',
};
const ROWS = Object.keys(ROW_LABEL) as Row[];
/** The kinds that need an answer, and the rest (every-node ruling 2): one matrix each. */
const ASKS = KINDS.filter((k) => NODE_TYPES[k].answer);
const TELLS = KINDS.filter((k) => !NODE_TYPES[k].answer);
/** A card that needs no answer offers no ✓ or ✗, so it never reaches acknowledged or dropped. */
const TELL_ROWS = ROWS.filter((s) => s !== 'acknowledged' && s !== 'dropped');

/** What an app card shows when a sample gives no app state: its app ready, as list_apps would say
 * (the gallery has no app host), so the slot draws the frame's placeholder, as the board does when
 * zoomed out, not a "Loading…" that never ends (app-cards FE_02). */
const APP_READY: CardConditions['app'] = { info: { id: 'calculator', state: 'ready', tools: [], allowed: false } };

/** A real <vb-node>, rendered and updated as the board does. The Markdown and note bubble sections
 * draw their cards with it too; `state` is the notes board's for the note samples. */
export function card(n: ViewNode, fx: Fixture, state = fx.state, c: CardConditions = {}, selected = SELECTED.has(n.title)): VbNodeElement {
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n, { ...ownIds(), markdown: pageMarkdown() });
  node.update(nodeState(n, state, undefined, selected, n.kind === 'app' && !c.app ? { ...c, app: APP_READY } : c));
  const live = LIVE_CLASS[n.title];
  if (live) node.classList.add(live);
  return node;
}

/** Columns are `kinds`, rows `rows`: one card in each cell, from the fixture's kinds region. */
function matrix(fx: Fixture, kinds: readonly Kind[], rows: readonly Row[]): HTMLElement {
  const grid = el('div', 'g-matrix');
  const heads = el('div', 'g-cards g-kind-heads');
  heads.setAttribute('aria-hidden', 'true');
  heads.append(...kinds.map((k) => el('p', 'g-kind-head', NODE_TYPES[k].label)));
  const top = el('div', 'g-row');
  top.append(el('p', 'g-row-label'), heads);
  grid.append(top);
  const nodes = fx.view.nodes.filter((n) => n.region === REGION_KINDS);
  const rowOf = (n: ViewNode): Row => (fx.cleared.has(n.n!) ? 'cleared' : statusOf(fx.state, n.id));
  for (const r of rows) {
    const found = kinds.flatMap((kind) => nodes.filter((x) => x.kind === kind && rowOf(x) === r).slice(0, 1));
    const cells = found.map((n) => card(n, fx, fx.state, fx.cleared.get(n.n!)));
    const row = el('div', 'g-row');
    row.append(el('p', 'g-row-label', ROW_LABEL[r]!), cardList(`${ROW_LABEL[r]}, one card of each kind`, ...cells));
    grid.append(row);
  }
  return grid;
}

/** The open card of each kind, selected (review polish FE_01): the lifted look is one rule, so every
 * kind, the grey ones too, shows it side by side. */
function selectedKinds(fx: Fixture): HTMLElement {
  const open = fx.view.nodes.filter((n) => n.region === REGION_KINDS && !fx.cleared.has(n.n!) && statusOf(fx.state, n.id) === 'open');
  const cards = KINDS.flatMap((kind) => open.filter((n) => n.kind === kind).slice(0, 1)).map((n) => card(n, fx, fx.state, {}, true));
  const list = cardList('Selected, one card of each kind', ...cards);
  list.toggleAttribute('data-selected-kinds', true);
  return list;
}

/** Two cards with a cut note, each with its full-text tip open the way hover or keyboard focus opens
 * it (`data-tip-open`, the attribute the hover tip sets on the note): a note of a few lines past
 * the clamp, and one longer than the tip's maximum height, which scrolls (found-in-use FE_04). */
function notePreviews(fx: Fixture): HTMLElement {
  const open = (title: string, notes: boolean) => {
    const view = notes ? fx.notes : fx;
    const c = card(view.view.nodes.find((n) => n.title === title)!, fx, view.state);
    c.querySelector('.vb-node-note')!.toggleAttribute('data-tip-open', true);
    return c;
  };
  const list = cardList('Cut notes with their preview open',
    open('A long note that asks for more context', false), open('A note longer than its preview', true));
  list.classList.add('g-tips');
  return list;
}

/** Notes put away and note times (card-polish FE_02), from the notes board's ledger: a thread put
 * away (its head alone, Show on the right), one put away before the agent replied ("· 1 new reply"), and a note and its reply
 * with their time chips showing, as hover or keyboard focus shows them (`data-hover`), the reply
 * also wearing the ring a history row's highlight gives it for a moment (`data-flash`). */
function hiddenAndTimes(fx: Fixture): HTMLElement {
  const of = (title: string) => {
    const n = fx.notes.view.nodes.find((x) => x.title === title)!;
    return card(n, fx, fx.notes.state, fx.notes.cards.get(n.n!));
  };
  const timed = of('Note times');
  for (const part of timed.querySelectorAll('.vb-node-note, .vb-node-reply')) part.toggleAttribute('data-hover', true);
  timed.querySelector('.vb-node-reply')!.toggleAttribute('data-flash', true);
  return cardList('Notes put away, and note times', of('Notes put away'), of('A reply since you put them away'), timed);
}

export function nodeSamples(body: HTMLElement, fx: Fixture): void {
  const others = fx.view.nodes.filter((n) => n.region === REGION_OTHER).map((n) => card(n, fx));
  body.append(
    group('Cards that ask, in every status', 'A question, decision or action needs an answer, and only ✓ (Check) or ✗ (Cross) gives one: the card says what each means, the board never does. A lit ✓ or ✗ in its state colour is the whole state, with no word after it; ✗ neither fades the card nor strikes it through. A note never answers: it puts the card with the agent, "Replied", neither open nor answered. The agent\'s answer to the note brings it back to open and clears an earlier ✓, ✗ or Later, with its "1 update" tab until you look. Columns are kinds, rows the state.',
      matrix(fx, ASKS, ROWS)),
    group('Cards that tell, in every status', 'Every other kind is numbered and takes a comment or Later, never ✓ or ✗, shows no status word, and counts in no "answered" total.',
      matrix(fx, TELLS, TELL_ROWS)),
    group('Other states', 'Pinned, emphasis, tags, a note, an edited note, a long note asking for more context, a topic and a note, long text, the lifted look while dragging, and selected (its name ends ", selected"). Focus is checked on the board page.',
      cardList('Other node states', ...others)),
    group('Selected, every kind', 'The person\'s pick, about two-thirds of a step toward the strong ink (--vb-select-lift) and a little more saturated (--vb-select-chroma): deeper in light, lighter in dark, the same for the grey note and the purple topic.',
      selectedKinds(fx)),
    group('Notes on a card', 'A numbered pin on the top-right corner (the latest note) and the "Your note" block, oldest first like a chat, a new note at the bottom: a note not yet sent is pink; sent notes are grey and say Sent. A click on the pin or a note opens it in the note bubble.',
      cardList('Note states', ...fx.notes.view.nodes.filter((n) => !HIDDEN_AND_TIMES.has(n.title)).map((n) => card(n, fx, fx.notes.state, fx.notes.cards.get(n.n!))))),
    group('Notes put away, and note times', '"N notes" heads the thread, over one note too, with one toggle that always sits on the right: Hide puts the thread away, '
      + 'leaving the head, "2 notes", and Show brings it back. A reply that came after you put them away is counted there, "· 1 new reply", so none is missed. '
      + 'Hiding is yours alone, never sent to an agent. Hover or keyboard focus on a note or a reply shows its time in a chip at its top right '
      + '(the whole date in its tooltip); a screen reader hears the time once, after who wrote it. Drawn here as hover draws them; the reply also '
      + 'wears the ring the card history gives a note it takes you to.', hiddenAndTimes(fx)),
    group('Note preview', 'A note cut at three lines shows its full text, as Markdown, in a box beside the card on hover and on keyboard focus '
      + '(the note is a tab stop; Enter opens it in the note bubble); Esc dismisses it, and it stays while the pointer is on it. '
      + 'A longer note scrolls past the box\'s maximum height (notePreview flag). Both are drawn open here.', notePreviews(fx)),
  );
}
