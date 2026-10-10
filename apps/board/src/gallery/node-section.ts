// Gallery entry for <vb-node>: the cards that ask and the cards that tell, each kind in every status
// it can reach (every-node FE_01), then the other states (pinned, emphasis, tags, notes, topic and
// note, long text, lifted). Each card is a real <vb-node>: rendered
// from a ledger node and updated with `nodeState`, exactly as the board does.
import type { Kind, ViewNode } from '../../../../packages/format/src/index.ts';
import { KINDS, NODE_TYPES } from '../../../../packages/format/src/index.ts';
import type { ItemStatus } from '../../../../packages/actions/src/index.ts';
import { statusOf } from '../../../../packages/actions/src/index.ts';
import type { VbNodeElement } from '../../../../packages/ui/src/index.ts';
import { nodeState, STATUS_LABEL } from '../../../../packages/ui/src/index.ts';
import { cardList, el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';
import { REGION_KINDS, REGION_OTHER } from './fixture.ts';

/** Classes the board puts on a node while something is happening to it. Keyed by node title. */
const LIVE_CLASS: Record<string, string> = { 'Being dragged': 'dragging' };
/** View state the board passes to `nodeState`: the person's selection (3_FE_01). Keyed by title. */
const SELECTED = new Set(['Selected']);

const STATUSES = Object.keys(STATUS_LABEL) as ItemStatus[];
/** The kinds that need an answer, and the rest (every-node ruling 2): one matrix each. */
const ASKS = KINDS.filter((k) => NODE_TYPES[k].answer);
const TELLS = KINDS.filter((k) => !NODE_TYPES[k].answer);
/** A card that needs no answer offers no ✓ or ✗, so it never reaches acknowledged or dropped. */
const TELL_STATUSES = STATUSES.filter((s) => s !== 'acknowledged' && s !== 'dropped');

/** A real <vb-node>, rendered and updated as the board does. The Markdown and note bubble sections
 * draw their cards with it too; `state` is the notes board's for the note samples. */
export function card(n: ViewNode, fx: Fixture, state = fx.state): VbNodeElement {
  const node = document.createElement('vb-node') as VbNodeElement;
  node.render(n);
  node.update(nodeState(n, state, undefined, SELECTED.has(n.title)));
  const live = LIVE_CLASS[n.title];
  if (live) node.classList.add(live);
  return node;
}

/** Columns are `kinds`, rows `statuses`: one card in each cell, from the fixture's kinds region. */
function matrix(fx: Fixture, kinds: readonly Kind[], statuses: readonly ItemStatus[]): HTMLElement {
  const grid = el('div', 'g-matrix');
  const heads = el('div', 'g-cards g-kind-heads');
  heads.setAttribute('aria-hidden', 'true');
  heads.append(...kinds.map((k) => el('p', 'g-kind-head', NODE_TYPES[k].label)));
  const top = el('div', 'g-row');
  top.append(el('p', 'g-row-label'), heads);
  grid.append(top);
  const nodes = fx.view.nodes.filter((n) => n.region === REGION_KINDS);
  for (const status of statuses) {
    const cells = kinds.map((kind) => card(nodes.find((x) => x.kind === kind && statusOf(fx.state, x.id) === status)!, fx));
    const row = el('div', 'g-row');
    row.append(el('p', 'g-row-label', STATUS_LABEL[status]), cardList(`${STATUS_LABEL[status]}, one card of each kind`, ...cells));
    grid.append(row);
  }
  return grid;
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

export function nodeSamples(body: HTMLElement, fx: Fixture): void {
  const others = fx.view.nodes.filter((n) => n.region === REGION_OTHER).map((n) => card(n, fx));
  body.append(
    group('Cards that ask, in every status', 'A question, decision or action needs an answer: ✓, ✗ or a comment decides it (✓ and ✗ read "Yes" and "No" on a question, ✓ "Done" on an action). Columns are kinds, rows the status the person gave.',
      matrix(fx, ASKS, STATUSES)),
    group('Cards that tell, in every status', 'Every other kind is numbered and takes a comment, more context or Later, never ✓ or ✗, and counts in no "decided" total.',
      matrix(fx, TELLS, TELL_STATUSES)),
    group('Other states', 'Pinned, emphasis, tags, a note, an edited note, a long note asking for more context, a topic and a note, long text, the lifted look while dragging, and selected (its name ends ", selected"). Focus is checked on the board page.',
      cardList('Other node states', ...others)),
    group('Notes on a card', 'A numbered pin on the top-right corner (the latest note) and the "Your note" block, latest first: a note not yet sent is pink; sent notes are grey and say Sent. A click on the pin or a note opens it in the note bubble.',
      cardList('Note states', ...fx.notes.view.nodes.map((n) => card(n, fx, fx.notes.state)))),
    group('Note preview', 'A note cut at three lines shows its full text, as Markdown, in a box beside the card on hover and on keyboard focus '
      + '(the note is a tab stop; Enter opens it in the note bubble); Esc dismisses it, and it stays while the pointer is on it. '
      + 'A longer note scrolls past the box\'s maximum height (notePreview flag). Both are drawn open here.', notePreviews(fx)),
  );
}
