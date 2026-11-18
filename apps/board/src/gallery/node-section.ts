// Gallery entry for <vb-node>: the cards that ask and the cards that tell, each kind in every status
// it can reach (every-node FE_01) and once cleared by the agent's answer to a note (D-045), then the
// other states (pinned, emphasis, tags, notes, topic and note, long text, lifted), every mark on the node's edges where
// the default skin puts it (D-099). Each card is a real <vb-node>: rendered from a ledger node and updated with
// `nodeState`, exactly as the board does.
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

/** Classes the board puts on a node while something is happening to it. Keyed by node title. */
const LIVE_CLASS: Record<string, string> = { 'Being dragged': 'dragging' };
/** View state the board passes to `nodeState`: the person's selection (3_FE_01). Keyed by title. */
const SELECTED = new Set(['Selected']);

/** A matrix row: a status the person gave, or `cleared`, the agent's answer to the card's note
 *  (D-045, answer-model ruling 7): open again and unmarked, with "1 update" on its badge until looked at. */
type Row = ItemStatus | 'cleared';
/** The row's label: the status's word, or for ✓ and ✗ the mark and its name. */
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

export function nodeSamples(body: HTMLElement, fx: Fixture): void {
  const others = fx.view.nodes.filter((n) => n.region === REGION_OTHER).map((n) => card(n, fx));
  body.append(
    group('Cards that ask, in every status', 'A question, decision or action needs an answer, and only ✓ (Check) or ✗ (Cross) gives one: the card says what each means, the board never does. The disc at the top right is the answer: the kind\'s colour with a dark dot while waiting, filled green with a tick or red with a cross once answered; a ticked or crossed node is not otherwise recoloured. A note never answers: it puts the card with the agent, "Replied", neither open nor answered. The agent\'s answer to the note brings it back to open and clears an earlier ✓, ✗ or Later, with "1 update" on its badge until you look. Columns are kinds, rows the state.',
      matrix(fx, ASKS, ROWS)),
    group('Cards that tell, in every status', 'Every other kind is numbered and takes a comment or Later, never ✓ or ✗: it has no disc, and counts in no "answered" total.',
      matrix(fx, TELLS, TELL_ROWS)),
    group('Other states', 'Pinned (no mark on the node: Put back is in the number\'s menu), emphasis, tags, a note, an edited note, a long note asking for more context, a topic and a note, long text, the lifted look while dragging, and selected (its name ends ", selected"). Focus is checked on the board page.',
      cardList('Other node states', ...others)),
    group('Selected, every kind', 'The person\'s pick, about two-thirds of a step toward the strong ink (--vb-select-lift) and a little more saturated (--vb-select-chroma): deeper in light, lighter in dark, the same for the grey note and the purple topic.',
      selectedKinds(fx)),
    group('Notes on a card', 'The notes mark at the bottom right is always there: quiet with no note, a count with some, filled while an agent\'s reply is unread. It opens the node\'s conversation box (the note bubble pattern), where the notes are read and written.',
      cardList('Note states', ...fx.notes.view.nodes.map((n) => card(n, fx, fx.notes.state, fx.notes.cards.get(n.n!))))),
  );
}
