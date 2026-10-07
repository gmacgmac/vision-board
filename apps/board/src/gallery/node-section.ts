// Gallery entry for <vb-node>: every item kind in every status, then the other states (pinned,
// emphasis, tags, notes, non-items, long text, lifted). Each card is a real <vb-node>: rendered
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
const ITEM_KINDS = KINDS.filter((k) => NODE_TYPES[k].actions.length > 0);

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

/** A finding offers no Drop, so one cell of the grid is empty by design. */
const gap = (kind: Kind, status: ItemStatus): HTMLElement => {
  const cell = el('div', 'g-gap', `A ${NODE_TYPES[kind].label.toLowerCase()} has no ${STATUS_LABEL[status].toLowerCase()} state`);
  cell.setAttribute('aria-hidden', 'true');
  return cell;
};

function matrix(fx: Fixture): HTMLElement {
  const grid = el('div', 'g-matrix');
  const heads = el('div', 'g-cards g-kind-heads');
  heads.setAttribute('aria-hidden', 'true');
  heads.append(...ITEM_KINDS.map((k) => el('p', 'g-kind-head', NODE_TYPES[k].label)));
  const top = el('div', 'g-row');
  top.append(el('p', 'g-row-label'), heads);
  grid.append(top);
  const nodes = fx.view.nodes.filter((n) => n.region === REGION_KINDS);
  for (const status of STATUSES) {
    const cells = ITEM_KINDS.map((kind) => {
      const n = nodes.find((x) => x.kind === kind && statusOf(fx.state, x.id) === status);
      return n ? card(n, fx) : gap(kind, status);
    });
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
    group('Every kind in every status', 'Columns are kinds, rows are the status the person gave. Topics and notes are not items, so they have no status.', matrix(fx)),
    group('Other states', 'Pinned, emphasis, tags, a note, an edited note, a long note asking for more context, topic and note (not items), long text, the lifted look while dragging, and selected (its name ends ", selected"). Focus is checked on the board page.',
      cardList('Other node states', ...others)),
    group('Notes on a card', 'A numbered pin on the top-right corner (the latest note) and the "Your note" block, latest first: a note not yet sent is pink; sent notes are grey and say Sent. A click on the pin or a note opens it in the note bubble.',
      cardList('Note states', ...fx.notes.view.nodes.map((n) => card(n, fx, fx.notes.state)))),
    group('Note preview', 'A note cut at three lines shows its full text, as Markdown, in a box beside the card on hover and on keyboard focus '
      + '(the note is a tab stop; Enter opens it in the note bubble); Esc dismisses it, and it stays while the pointer is on it. '
      + 'A longer note scrolls past the box\'s maximum height (notePreview flag). Both are drawn open here.', notePreviews(fx)),
  );
}
