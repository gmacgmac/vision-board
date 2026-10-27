// Gallery entry for the person's flag (cardFlag flag, field report batch 2 ruling 3, assumption A),
// shown by default (gallery.html?flags=-cardFlag hides it): cards drawn with the flag button beside
// Later, at rest, flagged, and flagged before the agent redrew the card (the flag stays); then the
// toolbar's "N flagged" chip. The cards are real <vb-node> elements from the fixture ledger's marks
// board, rendered with the button as the board renders them; the chip is the toolbar's own component.
import { mount } from 'svelte';
import type { VbNodeElement } from '#ui';
import { FLAG_KEY, nodeState } from '#ui';
import FlaggedChip from '../shell/FlaggedChip.svelte';
import { cardList, el, group } from './dom.ts';
import type { Fixture } from './fixture.ts';

export function flagSection(fx: Fixture): HTMLElement {
  const { view, state } = fx.marks;
  const cards = view.nodes.filter((n) => n.region === 'flagged').map((n) => {
    const node = document.createElement('vb-node') as VbNodeElement;
    node.render(n, { flag: true });
    node.update(nodeState(n, state));
    return node;
  });
  const chip = el('div', 'g-toolbar vb-counts');
  mount(FlaggedChip, { target: chip, props: { count: state.flags.size, onclick: () => undefined } });
  const box = el('section', 'g-section');
  box.dataset.feature = 'cardFlag';
  box.setAttribute('aria-labelledby', 'feature-cardFlag');
  const heading = el('h2', 'g-title', 'The flag');
  heading.id = 'feature-cardFlag';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'act flag | unflag { n }'), ' · feature flag cardFlag (api.md 128), on by default · off with ?flags=-cardFlag');
  const canvas = el('div', 'g-sizes vb-ground');
  canvas.append(cardList('Flag states', ...cards));
  box.append(heading,
    el('p', 'g-desc', `The person's private mark on any card: the flag button beside Later, or ${FLAG_KEY} on a focused card. It is kept in the ledger and never sent to an agent; no Send, chat chip or agent read carries it.`),
    meta,
    group('On a card', 'At rest, flagged (the button pressed, its flag filled), and flagged before the agent drew the card again: a flag names no version, so it stays.', canvas),
    group('In the toolbar', 'While any card on the board is flagged, the counts end in "N flagged": a press focuses the next flagged card, in number order, and the board pans to it.', chip));
  return box;
}
