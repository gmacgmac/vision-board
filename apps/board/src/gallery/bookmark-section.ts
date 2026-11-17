// Gallery entry for the person's bookmark (cardBookmark flag, D-099 2; the flag before ledger format 20), shown by
// default (gallery.html?flags=-cardBookmark hides it): cards drawn with the bookmark button beside Later, at rest,
// bookmarked, and bookmarked before the agent redrew the card (the bookmark stays); then the toolbar's
// "N bookmarked" chip. The cards are real <vb-node> elements from the fixture ledger's marks
// board, rendered with the button as the board renders them; the chip is the toolbar's own component.
import { mount } from 'svelte';
import type { VbNodeElement } from '#ui';
import { BOOKMARK_KEY, nodeState } from '#ui';
import { BookmarkedChip } from '../board/chrome/index.ts';
import { cardList, el, group, ownIds } from './dom.ts';
import type { Fixture } from './fixture.ts';

export function bookmarkSection(fx: Fixture): HTMLElement {
  const { view, state } = fx.marks;
  const cards = view.nodes.filter((n) => n.region === 'flagged').map((n) => {
    const node = document.createElement('vb-node') as VbNodeElement;
    node.render(n, { ...ownIds(), bookmark: true });
    node.update(nodeState(n, state));
    return node;
  });
  const chip = el('div', 'g-toolbar vb-counts');
  mount(BookmarkedChip, { target: chip, props: { count: state.bookmarks.size, onclick: () => undefined } });
  const box = el('section', 'g-section');
  box.dataset.feature = 'cardBookmark';
  box.setAttribute('aria-labelledby', 'feature-cardBookmark');
  const heading = el('h2', 'g-title', 'The bookmark');
  heading.id = 'feature-cardBookmark';
  const meta = el('p', 'g-meta');
  meta.append(el('code', undefined, 'act bookmark | unbookmark { n }'), ' · feature flag cardBookmark (api.md 128), on by default · off with ?flags=-cardBookmark');
  const canvas = el('div', 'g-sizes vb-ground');
  canvas.append(cardList('Bookmark states', ...cards));
  box.append(heading,
    el('p', 'g-desc', `The person's private mark on any card: the bookmark button beside Later, or ${BOOKMARK_KEY} on a focused card. It is kept in the ledger and never sent to an agent; no Send, chat chip or agent read carries it.`),
    meta,
    group('On a card', 'At rest, bookmarked (the button pressed, its glyph filled), and bookmarked before the agent drew the card again: a bookmark names no version, so it stays.', canvas),
    group('In the toolbar', 'While any card on the board is bookmarked, the counts end in "N bookmarked": a press focuses the next bookmarked card, in number order, and the board pans to it.', chip));
  return box;
}
